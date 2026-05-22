mod commands;
mod store;

use tauri::Manager;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_state,
            commands::save_state,
            commands::load_config,
            commands::save_config,
            commands::load_graveyard,
            commands::reset_pet,
            commands::append_session,
            commands::load_evolution_rules,
            commands::load_egg_lineage,
            commands::get_sprite_base_path,
            commands::show_control_window,
            commands::move_pet_window,
            commands::resize_pet_window,
            commands::update_tray,
        ])
        .setup(|app| {
            // Ensure user data directory exists
            let data_dir = store::get_data_dir();
            std::fs::create_dir_all(&data_dir).ok();

            // Build tray menu
            let show_item = MenuItemBuilder::with_id("show", "Show Status")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit")
                .build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            // Create system tray
            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("DigiModoro")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            let _ = commands::show_control_window(app.clone());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let _ = commands::show_control_window(app.clone());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide control window instead of closing it
            if window.label() == "control" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    window.hide().ok();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
