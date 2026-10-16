use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::Path};
#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Bounds {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub always_on_top: bool,
    pub auto_start: bool,
    pub locked: bool,
    pub visible: bool,
    pub bounds: Option<Bounds>,
    pub window_physical: Option<Bounds>,
    pub card: BTreeMap<String, String>,
    pub card_id: Option<String>,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            always_on_top: true,
            auto_start: false,
            locked: false,
            visible: true,
            bounds: None,
            window_physical: None,
            card: BTreeMap::new(),
            card_id: None,
        }
    }
}
pub fn read(dir: &Path) -> Settings {
    let mut v: Settings = fs::read(dir.join("settings.json"))
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default();
    v.locked = false;
    v.visible = true;
    v
}
pub fn write(dir: &Path, v: &Settings) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let temp = dir.join("settings.json.tmp");
    fs::write(&temp, serde_json::to_vec_pretty(v).unwrap()).map_err(|e| e.to_string())?;
    fs::rename(temp, dir.join("settings.json")).map_err(|e| e.to_string())
}
pub fn safe_card(card: BTreeMap<String, String>) -> BTreeMap<String, String> {
    card.into_iter()
        .filter(|(k, v)| k.starts_with("card.") && k.len() < 100 && v.len() < 80000)
        .collect()
}
pub fn fit(b: &Bounds, areas: &[Bounds]) -> Bounds {
    let fallback = Bounds {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };
    let area = areas
        .iter()
        .max_by_key(|a| {
            let w = (b.x as i64 + b.width as i64).min(a.x as i64 + a.width as i64)
                - (b.x as i64).max(a.x as i64);
            let h = (b.y as i64 + b.height as i64).min(a.y as i64 + a.height as i64)
                - (b.y as i64).max(a.y as i64);
            w.max(0) * h.max(0)
        })
        .unwrap_or(&fallback);
    let width = b.width.max(240).min(area.width);
    let height = b.height.max(360).min(area.height);
    Bounds {
        x: b.x.clamp(area.x, area.x + (area.width - width) as i32),
        y: b.y.clamp(area.y, area.y + (area.height - height) as i32),
        width,
        height,
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn retain_or_recover_position() {
        let a = Bounds {
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let b = Bounds {
            x: -1100,
            y: 210,
            width: 340,
            height: 510,
        };
        assert_eq!(fit(&b, &[a.clone()]), b);
        assert_eq!(
            fit(
                &Bounds {
                    x: 9000,
                    y: 9000,
                    ..b.clone()
                },
                &[a]
            ),
            Bounds {
                x: -340,
                y: 570,
                ..b
            }
        );
    }
    #[test]
    fn defaults_are_opt_in() {
        assert!(!Settings::default().auto_start);
    }
}
