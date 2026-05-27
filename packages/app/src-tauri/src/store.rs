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

fn box_path() -> PathBuf {
    get_data_dir().join("box.json")
}

const BOX_CAPACITY: usize = 5;

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

// --- box (favorite digimon storage) ---

fn empty_box() -> serde_json::Value {
    let slots: Vec<serde_json::Value> = (0..BOX_CAPACITY).map(|_| serde_json::Value::Null).collect();
    serde_json::json!({ "slots": slots })
}

pub fn load_box_json() -> Result<serde_json::Value, String> {
    ensure_dirs();
    let path = box_path();
    if !path.exists() {
        return Ok(empty_box());
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("read box: {}", e))?;
    let mut val: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("parse box: {}", e))?;
    // Tolerate older/shorter slot arrays by padding to capacity.
    if let Some(arr) = val.get_mut("slots").and_then(|s| s.as_array_mut()) {
        while arr.len() < BOX_CAPACITY {
            arr.push(serde_json::Value::Null);
        }
        arr.truncate(BOX_CAPACITY);
    } else {
        return Ok(empty_box());
    }
    Ok(val)
}

fn save_box_json(box_data: &serde_json::Value) -> Result<(), String> {
    ensure_dirs();
    let json = serde_json::to_string_pretty(box_data).map_err(|e| e.to_string())?;
    atomic_write(&box_path(), &json)
}

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Apply time-shift to a frozen pet so it resumes where it left off.
/// `streak.lastForkAt` and `bornAt` shift forward by the elapsed frozen
/// duration; `evolutionHistory[i].at` stays as historical timestamps.
fn time_shift_unfrozen(pet: &mut serde_json::Value, frozen_at: i64, now: i64) {
    let elapsed = (now - frozen_at).max(0);
    if elapsed == 0 {
        return;
    }
    if let Some(streak) = pet.get_mut("streak") {
        if let Some(last) = streak.get_mut("lastForkAt") {
            if let Some(n) = last.as_i64() {
                if n > 0 {
                    *last = serde_json::Value::from(n + elapsed);
                }
            }
        }
    }
    if let Some(born) = pet.get_mut("bornAt") {
        if let Some(n) = born.as_i64() {
            *born = serde_json::Value::from(n + elapsed);
        }
    }
}

fn slots_array_mut(box_data: &mut serde_json::Value) -> Result<&mut Vec<serde_json::Value>, String> {
    box_data
        .get_mut("slots")
        .and_then(|s| s.as_array_mut())
        .ok_or_else(|| "box.json malformed: missing slots array".to_string())
}

/// Put the active pet into an empty slot, return a fresh egg PetState that the
/// caller wrote as the new active state.
pub fn save_current_to_box_store(
    slot_idx: usize,
    current: &serde_json::Value,
    new_egg: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    if slot_idx >= BOX_CAPACITY {
        return Err(format!("slot_idx out of range: {}", slot_idx));
    }
    let mut box_data = load_box_json()?;
    let now = now_secs();
    {
        let slots = slots_array_mut(&mut box_data)?;
        if !slots[slot_idx].is_null() {
            return Err(format!("slot {} is not empty", slot_idx));
        }
        slots[slot_idx] = serde_json::json!({
            "frozenAt": now,
            "pet": current,
        });
    }
    // Persist both: box first, then state. If state save fails the user keeps
    // both copies — annoying but not catastrophic; they can delete from box.
    save_box_json(&box_data)?;
    save_state_json(new_egg)?;
    Ok(new_egg.clone())
}

/// Take a frozen pet out of `target_slot_idx`, place the active pet into the
/// first empty slot, and return the unfrozen pet (now to be the new active).
pub fn take_out_of_box_store(
    target_slot_idx: usize,
    current: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    if target_slot_idx >= BOX_CAPACITY {
        return Err(format!("slot_idx out of range: {}", target_slot_idx));
    }
    let mut box_data = load_box_json()?;
    let now = now_secs();
    let mut new_active = {
        let slots = slots_array_mut(&mut box_data)?;
        if slots[target_slot_idx].is_null() {
            return Err(format!("slot {} is empty", target_slot_idx));
        }
        // Find an empty slot to park the current pet into. The just-vacated
        // target slot doesn't count yet — we look first for a pre-existing
        // empty, falling back to target. Either way the box ends with 5
        // entries, one of which is `current` and target is now active.
        let park_idx = slots
            .iter()
            .enumerate()
            .find(|(i, v)| *i != target_slot_idx && v.is_null())
            .map(|(i, _)| i)
            .unwrap_or(target_slot_idx);

        let entry = std::mem::replace(&mut slots[target_slot_idx], serde_json::Value::Null);
        let frozen_at = entry
            .get("frozenAt")
            .and_then(|v| v.as_i64())
            .unwrap_or(now);
        let mut pet = entry
            .get("pet")
            .cloned()
            .ok_or_else(|| "frozen entry missing pet".to_string())?;
        time_shift_unfrozen(&mut pet, frozen_at, now);

        // Park current
        slots[park_idx] = serde_json::json!({
            "frozenAt": now,
            "pet": current,
        });
        pet
    };
    // `new_active` is already mutated by time_shift. Save both files.
    save_box_json(&box_data)?;
    save_state_json(&new_active)?;
    // Touch to silence "unused mut" if optimizer prunes the mut path
    let _ = &mut new_active;
    Ok(new_active)
}

pub fn delete_box_slot_store(slot_idx: usize) -> Result<(), String> {
    if slot_idx >= BOX_CAPACITY {
        return Err(format!("slot_idx out of range: {}", slot_idx));
    }
    let mut box_data = load_box_json()?;
    {
        let slots = slots_array_mut(&mut box_data)?;
        if slots[slot_idx].is_null() {
            return Err(format!("slot {} is already empty", slot_idx));
        }
        slots[slot_idx] = serde_json::Value::Null;
    }
    save_box_json(&box_data)
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
        .resolve("resources/sprites", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("resolve sprites: {}", e))
}
