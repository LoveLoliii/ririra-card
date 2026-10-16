use winreg::{enums::*, RegKey};
const NAME: &str = "Ririra Card Pendant";
pub fn enabled() -> bool {
    let h = RegKey::predef(HKEY_CURRENT_USER);
    let Ok(run) = h.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") else {
        return false;
    };
    let Ok(value) = run.get_value::<String, _>(NAME) else {
        return false;
    };
    let Ok(exe) = std::env::current_exe() else {
        return false;
    };
    if value.to_lowercase() != format!("\"{}\"", exe.display()).to_lowercase() {
        return false;
    }
    if let Ok(approved) = h
        .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run")
    {
        if let Ok(v) = approved.get_raw_value(NAME) {
            if v.bytes.first().copied() == Some(3) {
                return false;
            }
        }
    }
    true
}
pub fn set(value: bool) -> Result<(), String> {
    let h = RegKey::predef(HKEY_CURRENT_USER);
    let (run, _) = h
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| e.to_string())?;
    if value {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        run.set_value(NAME, &format!("\"{}\"", exe.display()))
            .map_err(|e| e.to_string())?;
        let (approved, _) = h
            .create_subkey(
                "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run",
            )
            .map_err(|e| e.to_string())?;
        approved
            .set_raw_value(
                NAME,
                &winreg::RegValue {
                    vtype: REG_BINARY,
                    bytes: vec![2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                },
            )
            .map_err(|e| e.to_string())?;
    } else {
        match run.delete_value(NAME) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}
