use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

/// Get the user data directory: %APPDATA%/com.hendrix.digimodoro/
pub fn get_data_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("com.hendrix.digimodoro")
}

fn state_path() -> PathBuf {
    get_data_dir().join("state.json")
}

fn config_path() -> PathBuf {
    get_data_dir().join("config.json")
}

fn sessions_path() -> PathBuf {
    get_data_dir().join("sessions.jsonl")
}

fn graveyard_path() -> PathBuf {
    get_data_dir().join("graveyard.jsonl")
}

/// Atomic write: write to .tmp then rename
fn atomic_write(path: &PathBuf, data: &str) -> Result<(), String> {
    let tmp = path.with_extension(format!("tmp.{}", std::process::id()));
    fs::write(&tmp, data).map_err(|e| format!("write tmp failed: {}", e))?;
    fs::rename(&tmp, path).map_err(|e| format!("rename failed: {}", e))?;
    Ok(())
}

pub fn ensure_dirs() {
    let dir = get_data_dir();
    fs::create_dir_all(&dir).ok();
}

// --- state ---

pub fn load_state_json() -> Result<serde_json::Value, String> {
    ensure_dirs();
    let path = state_path();
    if !path.exists() {
        return Err("no_state".to_string());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("read state: {}", e))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse state: {}", e))
}

pub fn save_state_json(state: &serde_json::Value) -> Result<(), String> {
    ensure_dirs();
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    atomic_write(&state_path(), &json)
}

pub fn reset_pet_store(new_state: &serde_json::Value) -> Result<(), String> {
    ensure_dirs();
    // Archive current state to graveyard
    let state_file = state_path();
    if state_file.exists() {
        if let Ok(prev) = fs::read_to_string(&state_file) {
            let one_line = prev.chars().filter(|c| *c != '\n' && *c != '\r').collect::<String>();
            let mut file = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(graveyard_path())
                .map_err(|e| format!("open graveyard: {}", e))?;
            writeln!(file, "{}", one_line).map_err(|e| format!("write graveyard: {}", e))?;
        }
    }
    // Write fresh state
    save_state_json(new_state)
}

// --- config ---

pub fn load_config_json() -> Result<serde_json::Value, String> {
    ensure_dirs();
    let path = config_path();
    if !path.exists() {
        return Err("no_config".to_string());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("read config: {}", e))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse config: {}", e))
}

pub fn save_config_json(config: &serde_json::Value) -> Result<(), String> {
    ensure_dirs();
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    atomic_write(&config_path(), &json)
}

// --- sessions ---

pub fn append_session_json(session: &serde_json::Value) -> Result<(), String> {
    ensure_dirs();
    let line = serde_json::to_string(session).map_err(|e| e.to_string())?;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(sessions_path())
        .map_err(|e| format!("open sessions: {}", e))?;
    writeln!(file, "{}", line).map_err(|e| format!("write session: {}", e))?;
    Ok(())
}

// --- graveyard ---

pub fn load_graveyard_json() -> Result<Vec<serde_json::Value>, String> {
    ensure_dirs();
    let path = graveyard_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("read graveyard: {}", e))?;
    let mut out = vec![];
    for line in raw.lines() {
        let s = line.trim();
        if s.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(s) {
            out.push(v);
        }
    }
    Ok(out)
}

// --- evolution rules + egg lineage (bundled resources) ---

pub fn load_resource_json(app: &tauri::AppHandle, relative_path: &str) -> Result<serde_json::Value, String> {
    let resource_path = app
        .path()
        .resolve(relative_path, tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("resolve resource {}: {}", relative_path, e))?;
    let raw = fs::read_to_string(&resource_path)
        .map_err(|e| format!("read resource {}: {}", relative_path, e))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse resource {}: {}", relative_path, e))
}

pub fn get_sprites_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resolve("sprites", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("resolve sprites: {}", e))
}
