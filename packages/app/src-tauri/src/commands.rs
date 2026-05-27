use crate::store;
use tauri::menu::{ContextMenu, Menu, MenuItem, PredefinedMenuItem};
use tauri::webview::Webview;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(serde::Deserialize)]
pub struct PetMenuSpec {
    pub id: String,
    pub label: String,
}

// --- File I/O commands ---

#[tauri::command]
pub fn load_state() -> Result<serde_json::Value, String> {
    store::load_state_json()
}

#[tauri::command]
pub fn save_state(state: serde_json::Value) -> Result<(), String> {
    store::save_state_json(&state)
}

#[tauri::command]
pub fn load_config() -> Result<serde_json::Value, String> {
    store::load_config_json()
}

#[tauri::command]
pub fn save_config(config: serde_json::Value) -> Result<(), String> {
    store::save_config_json(&config)
}

#[tauri::command]
pub fn load_graveyard() -> Result<Vec<serde_json::Value>, String> {
    store::load_graveyard_json()
}

#[tauri::command]
pub fn load_box() -> Result<serde_json::Value, String> {
    store::load_box_json()
}

#[tauri::command]
pub fn save_current_to_box(
    slot_idx: usize,
    current: serde_json::Value,
    new_egg: serde_json::Value,
) -> Result<serde_json::Value, String> {
    store::save_current_to_box_store(slot_idx, &current, &new_egg)
}

#[tauri::command]
pub fn take_out_of_box(
    target_slot_idx: usize,
    current: serde_json::Value,
) -> Result<serde_json::Value, String> {
    store::take_out_of_box_store(target_slot_idx, &current)
}

#[tauri::command]
pub fn delete_box_slot(slot_idx: usize) -> Result<(), String> {
    store::delete_box_slot_store(slot_idx)
}

#[tauri::command]
pub fn reset_pet(new_state: serde_json::Value) -> Result<(), String> {
    store::reset_pet_store(&new_state)
}

#[tauri::command]
pub fn append_session(session: serde_json::Value) -> Result<(), String> {
    store::append_session_json(&session)
}

#[tauri::command]
pub fn load_evolution_rules(app: AppHandle) -> Result<serde_json::Value, String> {
    store::load_resource_json(&app, "resources/evolution.json")
}

#[tauri::command]
pub fn load_egg_lineage(app: AppHandle) -> Result<serde_json::Value, String> {
    store::load_resource_json(&app, "resources/egg-lineage.json")
}

// --- Sprite loading (data URL) ---

#[tauri::command]
pub fn load_sprite(app: AppHandle, relative_path: String) -> Result<String, String> {
    use base64::Engine;

    let sprites_dir = store::get_sprites_dir(&app)?;
    let full_path = sprites_dir.join(&relative_path);

    let bytes = std::fs::read(&full_path)
        .map_err(|e| format!("read sprite {}: {}", relative_path, e))?;

    let mime = if relative_path.ends_with(".gif") {
        "image/gif"
    } else {
        "image/png"
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

// --- Window management ---

#[tauri::command]
pub fn show_control_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("control") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    } else {
        let _win = WebviewWindowBuilder::new(
            &app,
            "control",
            WebviewUrl::App("control/index.html".into()),
        )
        .title("DigiModoro")
        .inner_size(380.0, 560.0)
        .resizable(false)
        .decorations(true)
        .visible(true)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_pet_window(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("pet") {
        win.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn resize_pet_window(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("pet") {
        win.set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_pet_menu(app: AppHandle, items: Vec<PetMenuSpec>) -> Result<(), String> {
    let webview_window = app
        .get_webview_window("pet")
        .ok_or_else(|| "pet window not found".to_string())?;
    let menu = Menu::new(&app).map_err(|e| e.to_string())?;
    for spec in items {
        if spec.id == "__sep__" {
            let sep = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
            menu.append(&sep).map_err(|e| e.to_string())?;
        } else {
            let item = MenuItem::with_id(
                &app,
                format!("pet:{}", spec.id),
                &spec.label,
                true,
                None::<&str>,
            )
            .map_err(|e| e.to_string())?;
            menu.append(&item).map_err(|e| e.to_string())?;
        }
    }
    let webview: &Webview<_> = webview_window.as_ref();
    menu.popup(webview.window()).map_err(|e| e.to_string())?;
    Ok(())
}


// --- Tray ---

#[tauri::command]
pub fn update_tray(app: AppHandle, title: String, _phase_info: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_title(Some(&title)).map_err(|e| e.to_string())?;
        tray.set_tooltip(Some(&format!("DigiModoro{}", title))).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
