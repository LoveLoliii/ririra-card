use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::HashSet, fs, path::Path};
const MAX: usize = 512 * 1024 * 1024;
pub const NAMES: [&str; 4] = [
    "model.glb",
    "background.png",
    "foreground.png",
    "preview.png",
];
const KEYS: [&str; 7] = [
    "card.text",
    "card.background",
    "card.frame",
    "card.effects",
    "card.renderStyle",
    "card.lighting",
    "card.characterTransparency",
];
pub fn active(dir: &Path) -> Option<Value> {
    fs::read(dir.join("active-card.json"))
        .ok()
        .and_then(|v| serde_json::from_slice(&v).ok())
}
fn invalid() -> String {
    "卡片为空、损坏或格式不受支持，请从 A 重新导出".into()
}
fn vector(v: &Value) -> Option<[f64; 3]> {
    let a = v.as_array()?;
    if a.len() != 3 {
        return None;
    }
    let result = [a[0].as_f64()?, a[1].as_f64()?, a[2].as_f64()?];
    result
        .iter()
        .all(|v| v.is_finite() && v.abs() < 10000.)
        .then_some(result)
}
pub fn validate(bytes: &[u8]) -> Result<(Value, usize), String> {
    if bytes.len() < 14 || bytes.len() > MAX || &bytes[..8] != b"RIRIRA01" {
        return Err(invalid());
    }
    let len = u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize;
    if !(2..=1024 * 1024).contains(&len) || 12 + len > bytes.len() {
        return Err(invalid());
    }
    let m: Value = serde_json::from_slice(&bytes[12..12 + len]).map_err(|_| invalid())?;
    if m["format"] != "ririra-card" || m["version"] != 1 || m["rendererVersion"] != 1 {
        return Err("卡片格式不受支持，请更新桌面挂件".into());
    }
    if m["title"].as_str().is_none_or(|s| s.chars().count() > 200)
        || m["model"]["name"]
            .as_str()
            .is_none_or(|s| s.chars().count() > 200)
        || m["model"]["entry"] != "model.glb"
        || m["model"]["prepared"] != true
    {
        return Err(invalid());
    }
    let settings = m["settings"].as_object().ok_or_else(invalid)?;
    if settings.iter().any(|(k, v)| {
        !KEYS.contains(&k.as_str()) || v.as_str().is_none_or(|s| s.chars().count() > 20000)
    }) {
        return Err(invalid());
    }
    let position = vector(&m["view"]["position"]).ok_or_else(invalid)?;
    let target = vector(&m["view"]["target"]).ok_or_else(invalid)?;
    let distance = position
        .iter()
        .zip(target)
        .map(|(a, b)| (a - b).powi(2))
        .sum::<f64>()
        .sqrt();
    if !(0.01..=100.).contains(&distance)
        || !m["view"]["cardVisible"].is_boolean()
        || !m["view"]["wireframe"].is_boolean()
        || m["view"]["phase"]
            .as_f64()
            .is_none_or(|v| !(0.0..1.0).contains(&v))
    {
        return Err(invalid());
    }
    let assets = m["assets"].as_array().ok_or_else(invalid)?;
    if !(3..=4).contains(&assets.len()) {
        return Err(invalid());
    }
    let mut seen = HashSet::new();
    let mut offset = 0usize;
    let start = 12 + len;
    for a in assets {
        let name = a["path"].as_str().ok_or_else(invalid)?;
        if !NAMES.contains(&name) || !seen.insert(name) {
            return Err("资源路径无效或重复".into());
        }
        let length = a["length"]
            .as_u64()
            .filter(|n| *n > 0 && *n <= MAX as u64)
            .ok_or_else(invalid)? as usize;
        if a["offset"].as_u64() != Some(offset as u64)
            || offset + length > MAX
            || start + offset + length > bytes.len()
        {
            return Err(invalid());
        }
        let part = &bytes[start + offset..start + offset + length];
        if a["sha256"].as_str() != Some(format!("{:x}", Sha256::digest(part)).as_str()) {
            return Err(format!("卡片资源校验失败：{name}"));
        }
        if name == "model.glb" {
            if part.len() < 20
                || &part[..4] != b"glTF"
                || u32::from_le_bytes(part[4..8].try_into().unwrap()) != 2
                || u32::from_le_bytes(part[8..12].try_into().unwrap()) as usize != part.len()
                || &part[16..20] != b"JSON"
            {
                return Err("卡片中的三维模型无效".into());
            }
            let n = u32::from_le_bytes(part[12..16].try_into().unwrap()) as usize;
            if n > 16 * 1024 * 1024 || 20 + n > part.len() {
                return Err(invalid());
            }
            let doc: Value = serde_json::from_slice(&part[20..20 + n]).map_err(|_| invalid())?;
            for key in ["buffers", "images"] {
                if doc[key]
                    .as_array()
                    .is_some_and(|a| a.iter().any(|v| v.get("uri").is_some()))
                {
                    return Err("模型包含外部资源，请从 A 重新导出".into());
                }
            }
        } else {
            if part.len() < 24 || part[..8] != [137, 80, 78, 71, 13, 10, 26, 10] {
                return Err("卡片图片无效".into());
            }
            for p in [16, 20] {
                let size = u32::from_be_bytes(part[p..p + 4].try_into().unwrap());
                if !(1..=8192).contains(&size) {
                    return Err("卡片图片尺寸无效".into());
                }
            }
        }
        offset += length;
    }
    if NAMES[..3].iter().any(|n| !seen.contains(n)) || start + offset != bytes.len() {
        return Err(invalid());
    }
    Ok((m, start))
}
pub fn import(dir: &Path, source: &Path) -> Result<Value, String> {
    if !source
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("ririra"))
    {
        return Err("请选择 .ririra 卡片".into());
    }
    let info = fs::metadata(source).map_err(|e| e.to_string())?;
    if !info.is_file() || info.len() > MAX as u64 {
        return Err(invalid());
    }
    let bytes = fs::read(source).map_err(|e| e.to_string())?;
    let (manifest, start) = validate(&bytes)?;
    let id = uuid::Uuid::new_v4().to_string();
    let folder = dir.join("cards").join(&id);
    fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    for a in manifest["assets"].as_array().unwrap() {
        let offset = a["offset"].as_u64().unwrap() as usize;
        let length = a["length"].as_u64().unwrap() as usize;
        fs::write(
            folder.join(a["path"].as_str().unwrap()),
            &bytes[start + offset..start + offset + length],
        )
        .map_err(|e| e.to_string())?;
    }
    fs::write(
        folder.join("manifest.json"),
        serde_json::to_vec(&manifest).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    let result = json!({"id":id,"manifest":manifest});
    fs::write(
        dir.join("active-card.json.tmp"),
        serde_json::to_vec(&result).unwrap(),
    )
    .map_err(|e| e.to_string())?;
    fs::rename(
        dir.join("active-card.json.tmp"),
        dir.join("active-card.json"),
    )
    .map_err(|e| e.to_string())?;
    Ok(result)
}
pub fn resource(dir: &Path, path: &str) -> Option<Vec<u8>> {
    let rest = path.strip_prefix("/card-assets/")?;
    let (id, name) = rest.split_once('/')?;
    if uuid::Uuid::parse_str(id).is_err() || !NAMES.contains(&name) {
        return None;
    }
    fs::read(dir.join("cards").join(id).join(name)).ok()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_empty_and_traversal() {
        assert!(validate(b"RIRIRA01").is_err());
        assert!(resource(Path::new("."), "/card-assets/../../settings.json").is_none());
    }
    #[test]
    fn imports_existing_format() {
        if let Ok(p) = std::env::var("RIRIRA_TEST_CARD") {
            let b = fs::read(p).unwrap();
            assert!(validate(&b).is_ok());
            let mut corrupt = b.clone();
            *corrupt.last_mut().unwrap() ^= 1;
            assert!(validate(&corrupt).is_err());
            assert!(validate(&b[..b.len() - 1]).is_err());
        }
    }
}
