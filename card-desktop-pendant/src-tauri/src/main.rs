#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod card;
mod settings;
mod startup;
use base64::Engine;
use serde_json::{json, Value};
use settings::{Bounds, Settings};
use std::{
    borrow::Cow,
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    DragDropEvent, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewEvent, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
struct AppState {
    dir: PathBuf,
    settings: Mutex<Settings>,
    importing: AtomicBool,
    smoke: bool,
}
fn window(app: &tauri::AppHandle) -> WebviewWindow {
    app.get_webview_window("pendant").unwrap()
}
fn log(app: &tauri::AppHandle, value: Value) {
    let dir = &app.state::<AppState>().dir;
    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(dir.join("lite-runtime.log"))
    {
        let _ = writeln!(file, "{value}");
    }
}
fn error(message: impl AsRef<str>) {
    rfd::MessageDialog::new()
        .set_title("Ririra 桌面闪卡")
        .set_description(message.as_ref())
        .set_level(rfd::MessageLevel::Error)
        .show();
}
fn emit(app: &tauri::AppHandle, value: Value) {
    let _ = app.emit("pendant-action", value);
}
fn persist(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let Some(win) = app.get_webview_window("pendant") else {
        return Ok(());
    };
    let mut s = state.settings.lock().unwrap();
    let p = win.outer_position().map_err(|e| e.to_string())?;
    let z = win.outer_size().map_err(|e| e.to_string())?;
    let scale = win.scale_factor().unwrap_or(1.);
    s.window_physical = Some(Bounds {
        x: p.x,
        y: p.y,
        width: z.width,
        height: z.height,
    });
    s.bounds = Some(Bounds {
        x: (p.x as f64 / scale).round() as i32,
        y: (p.y as f64 / scale).round() as i32,
        width: (z.width as f64 / scale).round() as u32,
        height: (z.height as f64 / scale).round() as u32,
    });
    settings::write(&state.dir, &s)
}
fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let state = app.state::<AppState>();
    let s = state.settings.lock().unwrap().clone();
    let top = CheckMenuItem::with_id(app, "top", "始终置顶", true, s.always_on_top, None::<&str>)?;
    let auto = CheckMenuItem::with_id(
        app,
        "auto",
        "开机自动启动",
        !state.smoke,
        s.auto_start,
        None::<&str>,
    )?;
    let lock = CheckMenuItem::with_id(app, "lock", "锁定并穿透鼠标", true, s.locked, None::<&str>)?;
    MenuBuilder::new(app)
        .text("import", "导入ririra卡片")
        .text(
            "visible",
            if s.visible {
                "隐藏挂件"
            } else {
                "显示挂件"
            },
        )
        .separator()
        .item(&top)
        .item(&auto)
        .item(&lock)
        .separator()
        .text("small", "小 · 260 × 390")
        .text("medium", "中 · 340 × 510")
        .text("large", "大 · 440 × 660")
        .separator()
        .text("reset", "恢复正面")
        .text("effects", "播放 / 暂停特效")
        .text("unlock", "显示并解锁 · Ctrl+Alt+C")
        .separator()
        .text("quit", "退出挂件")
        .build()
}
fn refresh_tray(app: &tauri::AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id("pendant"), build_menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}
fn unlock_show(app: &tauri::AppHandle) {
    let win = window(app);
    let _ = win.set_ignore_cursor_events(false);
    let _ = win.show();
    {
        let state = app.state::<AppState>();
        let mut s = state.settings.lock().unwrap();
        s.locked = false;
        s.visible = true;
    }
    emit(app, json!({"type":"lock","value":false}));
    let _ = persist(app);
    refresh_tray(app);
}
#[tauri::command]
fn get_state(app: tauri::AppHandle) -> Value {
    let state = app.state::<AppState>();
    let s = state.settings.lock().unwrap();
    json!({"card":s.card,"locked":s.locked,"alwaysOnTop":s.always_on_top,"native":false})
}
#[tauri::command]
fn save_card(app: tauri::AppHandle, card: BTreeMap<String, String>) -> Result<(), String> {
    app.state::<AppState>().settings.lock().unwrap().card = settings::safe_card(card);
    persist(&app)
}
#[tauri::command]
fn save_window(app: tauri::AppHandle) -> Result<(), String> {
    persist(&app)
}
#[tauri::command]
fn begin_move(app: tauri::AppHandle) -> Result<(), String> {
    if app.state::<AppState>().settings.lock().unwrap().locked {
        return Ok(());
    }
    window(&app).start_dragging().map_err(|e| e.to_string())
}
#[tauri::command]
fn hide_widget(app: tauri::AppHandle) -> Result<(), String> {
    window(&app).hide().map_err(|e| e.to_string())?;
    app.state::<AppState>().settings.lock().unwrap().visible = false;
    persist(&app)?;
    refresh_tray(&app);
    Ok(())
}
#[tauri::command]
fn toggle_lock(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let value = !state.settings.lock().unwrap().locked;
    window(&app)
        .set_ignore_cursor_events(value)
        .map_err(|e| e.to_string())?;
    state.settings.lock().unwrap().locked = value;
    emit(&app, json!({"type":"lock","value":value}));
    persist(&app)?;
    refresh_tray(&app);
    Ok(())
}
#[tauri::command]
fn show_menu(app: tauri::AppHandle) -> Result<(), String> {
    window(&app)
        .popup_menu(&build_menu(&app).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}
async fn import_path(app: tauri::AppHandle, path: PathBuf) -> Result<(), String> {
    let state = app.state::<AppState>();
    if state.importing.swap(true, Ordering::SeqCst) {
        return Ok(());
    }
    let dir = state.dir.clone();
    emit(
        &app,
        json!({"type":"import-status","message":"正在读取卡片与校验资源…"}),
    );
    let result = tauri::async_runtime::spawn_blocking(move || card::import(&dir, &path))
        .await
        .map_err(|e| e.to_string())
        .and_then(|v| v);
    app.state::<AppState>()
        .importing
        .store(false, Ordering::SeqCst);
    let card = result?;
    {
        let state = app.state::<AppState>();
        let mut s = state.settings.lock().unwrap();
        s.card = serde_json::from_value(card["manifest"]["settings"].clone())
            .map_err(|e| e.to_string())?;
        s.card_id = card["id"].as_str().map(str::to_string);
    }
    unlock_show(&app);
    persist(&app)?;
    emit(&app, json!({"type":"refresh"}));
    log(
        &app,
        json!({"event":"card-imported","title":card["manifest"]["title"]}),
    );
    Ok(())
}
#[tauri::command]
async fn choose_card(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("导入ririra卡片")
        .add_filter("Ririra 卡片", &["ririra"])
        .pick_file()
        .await
    {
        if let Err(e) = import_path(app.clone(), file.path().to_owned()).await {
            emit(
                &app,
                json!({"type":"import-status","message":"卡片导入失败，请重试"}),
            );
            error(&e);
            return Err(e);
        }
    }
    Ok(())
}
#[tauri::command]
fn frontend_error(app: tauri::AppHandle, message: String) {
    log(&app, json!({"event":"frontend-error","message":message}));
}
#[tauri::command]
fn renderer_ready(app: tauri::AppHandle, mut state: Value) {
    let native = app.state::<AppState>();
    let win = window(&app);
    let _ = persist(&app);
    let screenshot = state.as_object_mut().and_then(|s| s.remove("screenshot"));
    let s = native.settings.lock().unwrap().clone();
    state["bounds"] = json!(s.window_physical);
    state["autoStart"] = json!(s.auto_start);
    state["engine"] = json!("WebView2 / Tauri");
    log(&app, json!({"event":"ready","state":state}));
    if native.smoke {
        if let Some(data) = screenshot.and_then(|v| v.as_str().map(str::to_owned)) {
            if let Some(base64) = data.strip_prefix("data:image/png;base64,") {
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64) {
                    let _ = fs::write(native.dir.join("smoke.png"), bytes);
                }
            }
        }
        let _ = fs::write(
            native.dir.join("smoke-result.json"),
            serde_json::to_vec_pretty(&state).unwrap(),
        );
        app.exit(
            if state["ready"] == true && state["meshCount"].as_u64().unwrap_or(0) > 0 {
                0
            } else {
                1
            },
        );
    } else {
        let _ = win.show();
    }
}
fn menu_action(app: &tauri::AppHandle, id: &str) {
    let result: Result<(), String> = (|| {
        match id {
            "import" => {
                let a = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = choose_card(a).await;
                });
            }
            "visible" => {
                let visible = app.state::<AppState>().settings.lock().unwrap().visible;
                if visible {
                    hide_widget(app.clone())?
                } else {
                    unlock_show(app)
                }
            }
            "top" => {
                let state = app.state::<AppState>();
                let next = !state.settings.lock().unwrap().always_on_top;
                window(app)
                    .set_always_on_top(next)
                    .map_err(|e| e.to_string())?;
                state.settings.lock().unwrap().always_on_top = next;
            }
            "auto" => {
                let state = app.state::<AppState>();
                if !state.smoke {
                    let next = !startup::enabled();
                    startup::set(next)?;
                    state.settings.lock().unwrap().auto_start = startup::enabled();
                }
            }
            "lock" => toggle_lock(app.clone())?,
            "unlock" => unlock_show(app),
            "reset" | "effects" => emit(app, json!({"type":id})),
            "small" | "medium" | "large" => {
                let width = match id {
                    "small" => 260.,
                    "large" => 440.,
                    _ => 340.,
                };
                window(app)
                    .set_size(tauri::LogicalSize::new(width, width * 1.5))
                    .map_err(|e| e.to_string())?;
            }
            "quit" => {
                let _ = persist(app);
                app.exit(0);
            }
            _ => {}
        }
        persist(app)?;
        refresh_tray(app);
        Ok(())
    })();
    if let Err(e) = result {
        error(e)
    }
}
fn dynamic_response(dir: &Path, path: &str) -> Option<(Vec<u8>, &'static str, u16)> {
    match path {
        "/api/active-card" => Some((
            serde_json::to_vec(&card::active(dir)).ok()?,
            "application/json",
            200,
        )),
        "/api/saved-model" => Some((b"null".to_vec(), "application/json", 200)),
        "/api/builtin" => Some((
            br#"{"native":false,"modelName":"Crystal"}"#.to_vec(),
            "application/json",
            200,
        )),
        p if p.starts_with("/card-assets/") => Some(match card::resource(dir, p) {
            Some(data) => (
                data,
                if p.ends_with(".png") {
                    "image/png"
                } else {
                    "model/gltf-binary"
                },
                200,
            ),
            None => (b"Not found".to_vec(), "text/plain", 404),
        }),
        _ => None,
    }
}
fn main() {
    if tauri::webview_version().is_err() {
        let answer=rfd::MessageDialog::new().set_title("需要 WebView2").set_description("此轻量版需要 Microsoft Edge WebView2 Runtime。是否打开微软官方下载页面？安装后重新打开挂件即可。").set_buttons(rfd::MessageButtons::YesNo).show();
        if answer == rfd::MessageDialogResult::Yes {
            let _ = std::process::Command::new("rundll32.exe")
                .args([
                    "url.dll,FileProtocolHandler",
                    "https://developer.microsoft.com/microsoft-edge/webview2/",
                ])
                .spawn();
        }
        return;
    }
    let args: Vec<String> = std::env::args().collect();
    let smoke = args.iter().any(|s| s == "--smoke-test");
    let profile = if smoke {
        args.windows(2)
            .find(|w| w[0] == "--test-profile")
            .map(|w| PathBuf::from(&w[1]))
            .unwrap_or_else(|| std::env::temp_dir().join("Ririra-Lite-Smoke"))
    } else {
        PathBuf::from(std::env::var_os("APPDATA").unwrap()).join("Ririra Card Pendant")
    };
    let _ = fs::create_dir_all(&profile);
    if smoke {
        let _ = fs::remove_file(profile.join("smoke-result.json"));
    }
    let mut settings = settings::read(&profile);
    settings.auto_start = !smoke && startup::enabled();
    if let Some(path) = args.iter().find(|s| s.to_lowercase().ends_with(".ririra")) {
        match card::import(&profile, Path::new(path)) {
            Ok(c) => {
                settings.card =
                    serde_json::from_value(c["manifest"]["settings"].clone()).unwrap_or_default();
                settings.card_id = c["id"].as_str().map(str::to_owned);
            }
            Err(e) => {
                error(&e);
                if smoke {
                    std::process::exit(1)
                }
            }
        }
    }
    if let Some(c) = card::active(&profile) {
        if settings.card_id.as_deref() != c["id"].as_str() {
            settings.card =
                serde_json::from_value(c["manifest"]["settings"].clone()).unwrap_or_default();
            settings.card_id = c["id"].as_str().map(str::to_owned);
        }
    }
    let resources = profile.clone();
    let initial = settings.clone();
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _| {
            unlock_show(app);
            if let Some(path) = args.iter().find(|p| p.to_lowercase().ends_with(".ririra")) {
                let app = app.clone();
                let path = PathBuf::from(path);
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = import_path(app, path).await {
                        error(e)
                    }
                });
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        unlock_show(app);
                    }
                })
                .build(),
        )
        .manage(AppState {
            dir: profile,
            settings: Mutex::new(settings),
            importing: AtomicBool::new(false),
            smoke,
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            save_card,
            save_window,
            begin_move,
            hide_widget,
            toggle_lock,
            show_menu,
            choose_card,
            renderer_ready,
            frontend_error
        ])
        .on_menu_event(|app, event| menu_action(app, event.id().as_ref()))
        .on_window_event(|win, event| {
            let app = win.app_handle();
            match event {
                WindowEvent::Moved(_) | WindowEvent::Resized(_) => {
                    let _ = persist(app);
                }
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = hide_widget(app.clone());
                }
                _ => {}
            }
        })
        .on_webview_event(|view, event| {
            if let WebviewEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = event {
                if let Some(path) = paths.first() {
                    let app = view.app_handle().clone();
                    let path = path.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = import_path(app, path).await {
                            error(e)
                        }
                    });
                }
            }
        })
        .setup(move |app| {
            let mut builder = WebviewWindowBuilder::new(
                app,
                "pendant",
                WebviewUrl::App("index.html?mode=pendant".into()),
            )
            .title("Ririra · 桌面闪卡 · Lite")
            .inner_size(340., 510.)
            .transparent(true)
            .decorations(false)
            .resizable(false)
            .shadow(false)
            .skip_taskbar(true)
            .always_on_top(initial.always_on_top)
            .visible(false)
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .initialization_script(include_str!("../bridge.js"))
            .on_navigation(|url| {
                url.host_str()
                    .is_some_and(|h| h == "tauri.localhost" || h == "localhost")
            })
            .on_web_resource_request(move |request, response| {
                if let Some((bytes, mime, status)) =
                    dynamic_response(&resources, request.uri().path())
                {
                    *response.status_mut() = tauri::http::StatusCode::from_u16(status).unwrap();
                    response
                        .headers_mut()
                        .insert("Content-Type", mime.parse().unwrap());
                    response
                        .headers_mut()
                        .insert("Cache-Control", "no-store".parse().unwrap());
                    response.headers_mut().remove("content-length");
                    *response.body_mut() = Cow::Owned(bytes);
                }
            });
            if let Some(b) = &initial.bounds {
                builder = builder
                    .position(b.x as f64, b.y as f64)
                    .inner_size(b.width as f64, b.height as f64);
            }
            let win = builder
                .data_directory(app.state::<AppState>().dir.join("webview2"))
                .build()?;
            let areas: Vec<Bounds> = win
                .available_monitors()?
                .into_iter()
                .map(|m| {
                    let a = m.work_area().clone();
                    Bounds {
                        x: a.position.x,
                        y: a.position.y,
                        width: a.size.width,
                        height: a.size.height,
                    }
                })
                .collect();
            let current = if let Some(b) = initial.window_physical {
                b
            } else if initial.bounds.is_some() {
                let p = win.outer_position()?;
                let s = win.outer_size()?;
                Bounds {
                    x: p.x,
                    y: p.y,
                    width: s.width,
                    height: s.height,
                }
            } else {
                let a = areas.first().cloned().unwrap_or(Bounds {
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080,
                });
                let size = win.outer_size()?;
                Bounds {
                    x: a.x + a.width as i32 - size.width as i32 - 30,
                    y: a.y + a.height as i32 - size.height as i32 - 30,
                    width: size.width,
                    height: size.height,
                }
            };
            let b = settings::fit(&current, &areas);
            win.set_size(PhysicalSize::new(b.width, b.height))?;
            win.set_position(PhysicalPosition::new(b.x, b.y))?;
            TrayIconBuilder::with_id("pendant")
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../../assets/tray.png"
                ))?)
                .tooltip("Ririra 桌面闪卡 · Lite")
                .menu(&build_menu(app.handle())?)
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } | TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        unlock_show(tray.app_handle());
                    }
                })
                .build(app)?;
            if !smoke {
                if let Err(e) = app.global_shortcut().register("Ctrl+Alt+C") {
                    log(
                        app.handle(),
                        json!({"event":"shortcut-unavailable","message":e.to_string()}),
                    );
                }
            }
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(60));
                if smoke {
                    let dir = &handle.state::<AppState>().dir;
                    if !dir.join("smoke-result.json").exists() {
                        log(&handle, json!({"event":"smoke-timeout"}));
                        handle.exit(1);
                    }
                }
            });
            log(
                app.handle(),
                json!({"event":"started","engine":"WebView2 / Tauri"}),
            );
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("无法启动 Ririra Lite");
    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            let _ = persist(handle);
        }
    });
}
