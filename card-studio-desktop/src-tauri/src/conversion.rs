use crate::Studio;
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::{BufRead, BufReader, Write},
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::Manager;
#[derive(Clone)]
pub struct Job {
    pub id: String,
    pub model: String,
    pub files: HashMap<String, u64>,
    pub received: HashSet<String>,
    pub status: String,
    pub message: String,
}
pub fn relative(s: &str) -> Result<&str, String> {
    if s.is_empty()
        || s.len() > 800
        || s.contains(['\\', ':'])
        || s.starts_with('/')
        || s.split('/').any(|v| v.is_empty() || v == ".." || v == ".")
    {
        return Err("文件路径不合法".into());
    }
    Ok(s)
}
pub fn decode(s: &str) -> Result<String, String> {
    let bytes = s.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if i + 2 >= bytes.len() {
                return Err("路径编码无效".into());
            }
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).map_err(|e| e.to_string())?;
            out.push(u8::from_str_radix(hex, 16).map_err(|e| e.to_string())?);
            i += 3
        } else {
            out.push(bytes[i]);
            i += 1
        }
    }
    String::from_utf8(out).map_err(|e| e.to_string())
}
pub fn public(job: &Job) -> Value {
    json!({"id":job.id,"status":job.status,"message":job.message,"modelName":job.model,"url":if job.status=="complete"{Some(format!("/output/conversions/{}/web/character.glb",job.id))}else{None}})
}
pub fn root(dir: &Path, id: &str) -> Result<PathBuf, String> {
    uuid::Uuid::parse_str(id).map_err(|_| "任务编号无效")?;
    Ok(dir.join("conversions").join(id))
}
#[tauri::command]
pub fn create_conversion(app: tauri::AppHandle, manifest: Value) -> Result<Value, String> {
    let state = app.state::<Studio>();
    let blender = state.settings.lock().unwrap().blender.clone();
    if blender.is_empty() {
        return Err(
            "请先点击顶部“设置 Blender”，选择本机 blender.exe；普通 GLB 模型无需 Blender".into(),
        );
    }
    let model = manifest["modelPath"].as_str().ok_or("模型路径无效")?;
    relative(model)?;
    if !model.to_lowercase().ends_with(".gltf") && !model.to_lowercase().ends_with(".glb") {
        return Err("只支持 glTF 或 GLB".into());
    }
    let entries = manifest["files"].as_array().ok_or("缺少文件清单")?;
    if entries.is_empty() || entries.len() > 4000 {
        return Err("请选择完整导出文件夹".into());
    }
    let mut files = HashMap::new();
    let mut total = 0;
    for e in entries {
        let name = e["path"].as_str().ok_or("资源路径无效")?;
        relative(name)?;
        let size = e["size"]
            .as_u64()
            .filter(|s| *s <= 256 * 1024 * 1024)
            .ok_or("文件过大")?;
        if files.insert(name.to_string(), size).is_some() {
            return Err("资源路径重复".into());
        }
        total += size;
    }
    if total > 1024 * 1024 * 1024 || !files.contains_key(model) {
        return Err("缺少模型或文件夹超过 1 GB".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    fs::create_dir_all(root(&state.dir, &id)?.join("input")).map_err(|e| e.to_string())?;
    let job = Job {
        id: id.clone(),
        model: model.into(),
        files,
        received: HashSet::new(),
        status: "uploading".into(),
        message: "正在接收模型资源…".into(),
    };
    let result = public(&job);
    state.jobs.lock().unwrap().insert(id, job);
    Ok(result)
}
#[tauri::command]
pub fn upload_file(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<Value, String> {
    let state = app.state::<Studio>();
    let id = request
        .headers()
        .get("x-job-id")
        .and_then(|h| h.to_str().ok())
        .ok_or("缺少任务编号")?;
    let name = decode(
        request
            .headers()
            .get("x-resource-path")
            .and_then(|h| h.to_str().ok())
            .ok_or("缺少资源路径")?,
    )?;
    relative(&name)?;
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("缺少文件内容".into());
    };
    let mut jobs = state.jobs.lock().unwrap();
    let job = jobs.get_mut(id).ok_or("任务不存在")?;
    if job.status != "uploading" || job.files.get(&name).copied() != Some(bytes.len() as u64) {
        return Err("文件大小或上传状态不匹配".into());
    }
    let path = root(&state.dir, id)?.join("input").join(&name);
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())?;
    job.received.insert(name);
    Ok(json!({"received":job.received.len()}))
}
#[tauri::command]
pub fn conversion_status(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    app.state::<Studio>()
        .jobs
        .lock()
        .unwrap()
        .get(&id)
        .map(public)
        .ok_or("任务不存在，请重新导入".into())
}
#[tauri::command]
pub fn start_conversion(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    let state = app.state::<Studio>();
    let mut jobs = state.jobs.lock().unwrap();
    let job = jobs.get_mut(&id).ok_or("任务不存在")?;
    if job.status != "uploading" || job.files.len() != job.received.len() {
        return Err("导出文件尚未传输完整".into());
    }
    let input = root(&state.dir, &id)?.join("input");
    let source = input.join(&job.model);
    let bytes = fs::read(&source).map_err(|e| e.to_string())?;
    let doc: Value = if job.model.to_lowercase().ends_with(".gltf") {
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())?
    } else {
        if bytes.len() < 20 || &bytes[..4] != b"glTF" {
            return Err("模型文件损坏".into());
        }
        let n = u32::from_le_bytes(bytes[12..16].try_into().unwrap()) as usize;
        if n > bytes.len() - 20 {
            return Err("模型结构损坏".into());
        }
        serde_json::from_slice(&bytes[20..20 + n]).map_err(|e| e.to_string())?
    };
    for key in ["buffers", "images"] {
        if let Some(entries) = doc[key].as_array() {
            for e in entries {
                if let Some(uri) = e["uri"].as_str() {
                    if !uri.starts_with("data:") {
                        let uri = decode(uri)?;
                        relative(&uri)?;
                        if !source.parent().unwrap().join(uri).is_file() {
                            return Err("模型依赖文件缺失".into());
                        }
                    }
                }
            }
        }
    }
    job.status = "queued".into();
    job.message = "等待本机材质转换…".into();
    let result = public(job);
    drop(jobs);
    let app = app.clone();
    std::thread::spawn(move || run(app, id));
    Ok(result)
}
fn update(app: &tauri::AppHandle, id: &str, status: &str, message: &str) {
    if let Some(j) = app.state::<Studio>().jobs.lock().unwrap().get_mut(id) {
        j.status = status.into();
        j.message = message.into();
    }
}
fn run(app: tauri::AppHandle, id: String) {
    let state = app.state::<Studio>();
    let _gate = state.conversion_gate.lock().unwrap();
    let job = state.jobs.lock().unwrap()[&id].clone();
    let folder = root(&state.dir, &id).unwrap();
    let out = folder.join("web");
    let _ = fs::create_dir_all(&out);
    let native = state.dir.join("native-tools/0.1.0");
    let blender = state.settings.lock().unwrap().blender.clone();
    update(&app, &id, "converting", "正在还原 FF14 材质与染色…");
    let result = (|| -> Result<(), String> {
        let mut log = fs::File::create(folder.join("conversion.log")).map_err(|e| e.to_string())?;
        let mut child = Command::new(blender)
            .args([
                "-b",
                "--disable-autoexec",
                "--factory-startup",
                "--python-exit-code",
                "1",
                "--python",
            ])
            .arg(native.join("scripts/prepare_imported_ff14.py"))
            .arg("--")
            .arg("--input")
            .arg(folder.join("input").join(&job.model))
            .arg("--out")
            .arg(&out)
            .current_dir(&native)
            .creation_flags(0x08000000)
            .stdout(Stdio::piped())
            .stderr(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .spawn()
            .map_err(|e| format!("无法启动 Blender，请检查路径：{e}"))?;
        for line in BufReader::new(child.stdout.take().unwrap()).lines() {
            let line = line.map_err(|e| e.to_string())?;
            let _ = writeln!(log, "{line}");
            if line.contains("WEB_MESH_READY") {
                update(
                    &app,
                    &id,
                    "converting",
                    &format!(
                        "正在烘焙网页贴图：{}",
                        line.split("WEB_MESH_READY").last().unwrap_or("")
                    ),
                )
            } else if line.contains("MATERIAL_RESTORED") {
                update(&app, &id, "converting", "正在还原服装、皮肤和头发材质…")
            }
        }
        let status = child.wait().map_err(|e| e.to_string())?;
        if !status.success() || !out.join("character.glb").is_file() {
            let log = fs::read_to_string(folder.join("conversion.log")).unwrap_or_default();
            let message = log
                .lines()
                .rev()
                .find_map(|s| s.split_once("RuntimeError:").map(|(_, e)| e.trim()))
                .unwrap_or("材质转换失败，请检查完整导出文件夹与 Blender 版本");
            return Err(message.into());
        }
        Ok(())
    })();
    match result {
        Ok(()) => update(&app, &id, "complete", "FF14 材质转换完成"),
        Err(e) => update(&app, &id, "failed", &e),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn reject_escape() {
        for p in ["../secret", "a/../b", "C:/x", "/x", "a\\b"] {
            assert!(relative(p).is_err())
        }
        assert_eq!(decode("cache%2F%E8%84%B8.png").unwrap(), "cache/脸.png");
    }
}
