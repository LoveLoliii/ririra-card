#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod conversion;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    borrow::Cow,
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
};
use tauri::{
    Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
#[derive(Default, Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
struct Settings {
    blender: String,
    bounds: Option<[i32; 4]>,
}
struct Studio {
    dir: PathBuf,
    settings: Mutex<Settings>,
    jobs: Mutex<HashMap<String, conversion::Job>>,
    conversion_gate: Mutex<()>,
    exports: Mutex<HashMap<String, PathBuf>>,
    export_count: AtomicUsize,
    smoke: bool,
    test_model: Option<PathBuf>,
}
fn write_settings(app: &tauri::AppHandle) {
    let s = app.state::<Studio>();
    let _ = fs::write(
        s.dir.join("settings.json.tmp"),
        serde_json::to_vec_pretty(&*s.settings.lock().unwrap()).unwrap(),
    );
    let _ = fs::rename(s.dir.join("settings.json.tmp"), s.dir.join("settings.json"));
}
fn persist_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("studio") {
        if win.is_minimized().unwrap_or(false) || win.is_maximized().unwrap_or(false) {
            return;
        }
        if let (Ok(p), Ok(z)) = (win.outer_position(), win.outer_size()) {
            app.state::<Studio>().settings.lock().unwrap().bounds =
                Some([p.x, p.y, z.width as i32, z.height as i32]);
            write_settings(app);
        }
    }
}
fn log(app: &tauri::AppHandle, event: Value) {
    if let Ok(mut f) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(app.state::<Studio>().dir.join("studio.log"))
    {
        let _ = writeln!(f, "{event}");
    }
}
fn model_entries(root: &Path, folder: &Path, out: &mut Vec<Value>) {
    if let Ok(entries) = fs::read_dir(folder) {
        for e in entries.flatten() {
            let p = e.path();
            if e.file_type().is_ok_and(|t| t.is_symlink()) {
                continue;
            }
            if p.is_dir() {
                model_entries(root, &p, out)
            } else if let Ok(relative) = p.strip_prefix(root) {
                let path = relative.to_string_lossy().replace('\\', "/");
                out.push(json!({"path":path,"url":format!("/test-model/{path}")}));
            }
        }
    }
}
#[tauri::command]
fn desktop_state(app: tauri::AppHandle) -> Value {
    let s = app.state::<Studio>();
    let files = s.test_model.as_ref().map(|model| {
        let mut files = Vec::new();
        if model
            .extension()
            .is_some_and(|s| s.eq_ignore_ascii_case("gltf"))
        {
            model_entries(model.parent().unwrap(), model.parent().unwrap(), &mut files);
            files.sort_by_key(|e| {
                if e["path"].as_str() == model.file_name().and_then(|s| s.to_str()) {
                    0
                } else {
                    1
                }
            });
        } else {
            let name = model.file_name().unwrap().to_string_lossy();
            files.push(json!({"path":name,"url":format!("/test-model/{name}")}));
        }
        files
    });
    json!({"smoke":s.smoke,"testModel":files,"blender":s.settings.lock().unwrap().blender})
}
#[tauri::command]
async fn choose_blender(app: tauri::AppHandle) -> Option<String> {
    let path = rfd::AsyncFileDialog::new()
        .set_title("选择 Blender 程序")
        .add_filter("Blender", &["exe"])
        .pick_file()
        .await?;
    let path = path.path().to_string_lossy().to_string();
    app.state::<Studio>().settings.lock().unwrap().blender = path.clone();
    write_settings(&app);
    Some(path)
}
fn safe_name(name: &str) -> String {
    let name: String = name
        .chars()
        .filter(|c| !c.is_control() && !"<>:\"/\\|?*".contains(*c))
        .take(150)
        .collect();
    if name.is_empty() || name == "." || name == ".." {
        "卡片.ririra".into()
    } else {
        name
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn export_name_is_a_single_file() {
        assert_eq!(safe_name("../卡片?.ririra"), "..卡片.ririra");
        assert_eq!(safe_name(".."), "卡片.ririra");
        assert_eq!(safe_name("我的卡片.png"), "我的卡片.png");
    }
}
#[tauri::command]
async fn choose_export(app: tauri::AppHandle, name: String) -> Option<String> {
    let name = safe_name(&name);
    let state = app.state::<Studio>();
    let path = if state.smoke {
        let p = state.dir.join("exports");
        fs::create_dir_all(&p).ok()?;
        p.join(name)
    } else {
        rfd::AsyncFileDialog::new()
            .set_title("保存导出文件")
            .set_file_name(&name)
            .save_file()
            .await?
            .path()
            .to_owned()
    };
    let token = uuid::Uuid::new_v4().to_string();
    app.state::<Studio>()
        .exports
        .lock()
        .unwrap()
        .insert(token.clone(), path);
    Some(token)
}
#[tauri::command]
fn save_export(app: tauri::AppHandle, request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let token = request
        .headers()
        .get("x-export-id")
        .and_then(|s| s.to_str().ok())
        .ok_or("缺少导出凭据")?;
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("导出内容无效".into());
    };
    if bytes.len() > 512 * 1024 * 1024 {
        return Err("导出文件超过 512 MB".into());
    }
    let state = app.state::<Studio>();
    let path = state
        .exports
        .lock()
        .unwrap()
        .remove(token)
        .ok_or("保存操作已取消或完成")?;
    let temp = path.with_extension(format!("{token}.tmp"));
    fs::write(&temp, bytes).map_err(|e| e.to_string())?;
    fs::rename(temp, &path).map_err(|e| e.to_string())?;
    state.export_count.fetch_add(1, Ordering::SeqCst);
    log(
        &app,
        json!({"event":"exported","file":path.file_name(),"bytes":bytes.len()}),
    );
    Ok(path.to_string_lossy().to_string())
}
#[tauri::command]
fn export_count(app: tauri::AppHandle) -> usize {
    app.state::<Studio>().export_count.load(Ordering::SeqCst)
}
#[tauri::command]
fn frontend_error(app: tauri::AppHandle, message: String) {
    log(&app, json!({"event":"frontend-error","message":message}));
    if app.state::<Studio>().smoke {
        app.exit(1)
    }
}
#[tauri::command]
fn smoke_done(app: tauri::AppHandle, mut state: Value) {
    let s = app.state::<Studio>();
    if !s.smoke {
        return;
    }
    if let Some(image) = state
        .as_object_mut()
        .and_then(|o| o.remove("screenshot"))
        .and_then(|v| v.as_str().map(str::to_owned))
    {
        if let Some(data) = image.strip_prefix("data:image/png;base64,") {
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(data) {
                let _ = fs::write(s.dir.join("smoke.png"), bytes);
            }
        }
    }
    let _ = fs::write(
        s.dir.join("smoke-result.json"),
        serde_json::to_vec_pretty(&state).unwrap(),
    );
    app.exit(0)
}
fn dynamic(app: &tauri::AppHandle, path: &str) -> Option<(Vec<u8>, &'static str, u16)> {
    let s = app.state::<Studio>();
    let path = conversion::decode(path).ok()?;
    let file = if let Some(p) = path.strip_prefix("/output/conversions/") {
        let (id, part) = p.split_once('/')?;
        conversion::relative(part).ok()?;
        if !part.starts_with("web/") {
            return Some((vec![], "text/plain", 403));
        }
        conversion::root(&s.dir, id).ok()?.join(part)
    } else if let Some(p) = path.strip_prefix("/test-model/") {
        let model = s.test_model.as_ref()?;
        conversion::relative(p).ok()?;
        model.parent()?.join(p)
    } else {
        return None;
    };
    let mime = if file
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("png"))
    {
        "image/png"
    } else {
        "application/octet-stream"
    };
    Some(match fs::read(file) {
        Ok(bytes) => (bytes, mime, 200),
        Err(_) => (vec![], "text/plain", 404),
    })
}
fn detect_blender() -> String {
    if let Ok(p) = std::env::var("BLENDER_PATH") {
        if Path::new(&p).is_file() {
            return p;
        }
    }
    if Path::new("O:/blender/blender.exe").is_file() {
        return "O:/blender/blender.exe".into();
    }
    let root = Path::new("C:/Program Files/Blender Foundation");
    if let Ok(entries) = fs::read_dir(root) {
        for e in entries.flatten() {
            let p = e.path().join("blender.exe");
            if p.is_file() {
                return p.to_string_lossy().to_string();
            }
        }
    }
    String::new()
}
fn main() {
    if tauri::webview_version().is_err() {
        rfd::MessageDialog::new().set_title("需要 WebView2").set_description("请安装 Microsoft Edge WebView2 Runtime 后重新打开工作台。下载地址：https://developer.microsoft.com/microsoft-edge/webview2/").show();
        return;
    }
    let args: Vec<String> = std::env::args().collect();
    let smoke = args.iter().any(|s| s == "--smoke-test");
    let ui_preview = args.iter().any(|s| s == "--ui-preview");
    let option = |key: &str| {
        args.windows(2)
            .find(|w| w[0] == key)
            .map(|w| PathBuf::from(&w[1]))
    };
    let dir = if smoke || ui_preview {
        option("--test-profile").unwrap_or_else(|| std::env::temp_dir().join("Ririra-Studio-Smoke"))
    } else {
        PathBuf::from(std::env::var_os("APPDATA").unwrap()).join("Ririra Card Studio")
    };
    let _ = fs::create_dir_all(&dir);
    let mut settings: Settings = fs::read(dir.join("settings.json"))
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
        .unwrap_or_default();
    if settings.blender.is_empty() {
        settings.blender = detect_blender()
    }
    let initial = settings.bounds;
    let mut builder = tauri::Builder::default();
    if !smoke && !ui_preview {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(win) = app.get_webview_window("studio") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }));
    }
    let app = builder
        .manage(Studio {
            dir,
            settings: Mutex::new(settings),
            jobs: Mutex::new(HashMap::new()),
            conversion_gate: Mutex::new(()),
            exports: Mutex::new(HashMap::new()),
            export_count: AtomicUsize::new(0),
            smoke,
            test_model: if smoke || ui_preview {
                option("--test-model")
            } else {
                None
            },
        })
        .invoke_handler(tauri::generate_handler![
            desktop_state,
            choose_blender,
            choose_export,
            save_export,
            export_count,
            frontend_error,
            smoke_done,
            conversion::create_conversion,
            conversion::upload_file,
            conversion::start_conversion,
            conversion::conversion_status
        ])
        .on_window_event(|win, event| {
            if matches!(
                event,
                WindowEvent::Moved(_)
                    | WindowEvent::Resized(_)
                    | WindowEvent::CloseRequested { .. }
            ) {
                persist_window(win.app_handle());
            }
        })
        .setup(move |app| {
            let files: Vec<String> =
                serde_json::from_str(include_str!("../../web/native-files.json"))?;
            let native = app.state::<Studio>().dir.join("native-tools/0.1.0");
            for p in files {
                let target = native.join(&p);
                if let Some(asset) = app.asset_resolver().get(p) {
                    fs::create_dir_all(target.parent().unwrap())?;
                    fs::write(target, asset.bytes)?;
                }
            }
            let handle = app.handle().clone();
            let mut builder =
                WebviewWindowBuilder::new(app, "studio", WebviewUrl::App("index.html".into()))
                    .title("Ririra 闪卡工作台")
                    .inner_size(1260., 850.)
                    .min_inner_size(900., 600.)
                    .visible(!smoke)
                    .disable_drag_drop_handler()
                    .data_directory(app.state::<Studio>().dir.join("webview2"))
                    .on_navigation(|url| {
                        url.host_str()
                            .is_some_and(|h| h == "localhost" || h == "tauri.localhost")
                    })
                    .on_web_resource_request(move |req, res| {
                        if let Some((bytes, mime, status)) = dynamic(&handle, req.uri().path()) {
                            *res.status_mut() = tauri::http::StatusCode::from_u16(status).unwrap();
                            res.headers_mut()
                                .insert("Content-Type", mime.parse().unwrap());
                            res.headers_mut()
                                .insert("Cache-Control", "no-store".parse().unwrap());
                            res.headers_mut().remove("content-length");
                            *res.body_mut() = Cow::Owned(bytes);
                        }
                    });
            if let Some(b) = initial {
                builder = builder.position(b[0] as f64, b[1] as f64);
            }
            let win = builder.build()?;
            if let Some([x, y, w, h]) = initial {
                let monitors = win.available_monitors()?;
                let area = monitors
                    .iter()
                    .find(|m| {
                        let a = m.work_area();
                        x >= a.position.x
                            && x < a.position.x + a.size.width as i32
                            && y >= a.position.y
                            && y < a.position.y + a.size.height as i32
                    })
                    .or(monitors.first());
                if let Some(m) = area {
                    let a = m.work_area();
                    let w = (w.max(900) as u32).min(a.size.width);
                    let h = (h.max(600) as u32).min(a.size.height);
                    win.set_size(PhysicalSize::new(w, h))?;
                    win.set_position(PhysicalPosition::new(
                        x.clamp(a.position.x, a.position.x + (a.size.width - w) as i32),
                        y.clamp(a.position.y, a.position.y + (a.size.height - h) as i32),
                    ))?;
                }
            }
            write_settings(app.handle());
            let a = app.handle().clone();
            if smoke {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(600));
                    a.exit(1);
                });
            }
            log(
                app.handle(),
                json!({"event":"started","engine":"Tauri / WebView2"}),
            );
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("无法启动工作台");
    app.run(|_, _| {});
}
