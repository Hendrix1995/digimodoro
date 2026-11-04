mod commands;
mod store;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = commands::open_control_window(app);
        }));
    }

    builder
        .plugin(tauri_plugin_notification::init())
        .manage(commands::PetDrag::default())
        .invoke_handler(tauri::generate_handler![
            commands::load_state,
            commands::save_state,
            commands::load_config,
            commands::save_config,
            commands::load_graveyard,
            commands::load_box,
            commands::save_current_to_box,
            commands::take_out_of_box,
            commands::delete_box_slot,
            commands::reset_pet,
            commands::append_session,
            commands::load_evolution_rules,
            commands::load_egg_lineage,
            commands::load_sprite,
            commands::show_control_window,
            commands::move_pet_window,
            commands::pet_drag_start,
            commands::pet_drag_move,
            commands::pet_drag_end,
            commands::resize_pet_window,
            commands::show_pet_menu,
            commands::update_tray,
            commands::quit_app,
        ])
        .on_menu_event(|app, event| {
            if let Some(action) = event.id().as_ref().strip_prefix("pet:") {
                if let Some(window) = app.get_webview_window("pet") {
                    let _ = window.emit("digi:pet-menu-action", action.to_string());
                }
            }
        })
        .setup(|app| {
            // Ensure user data directory exists
            let data_dir = store::get_data_dir();
            std::fs::create_dir_all(&data_dir).ok();

            #[cfg(windows)]
            if let Some(pet) = app.get_webview_window("pet") {
                hide_from_alt_tab(&pet);
            }

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
                .icon(tray_icon(app))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            let _ = commands::open_control_window(app);
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
                        let _ = commands::open_control_window(app);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                match window.label() {
                    // Hide control window instead of closing it
                    "control" => {
                        api.prevent_close();
                        window.hide().ok();
                    }
                    // The pet window owns the scheduler; never let Alt+F4 close it.
                    // Quitting goes through the tray / pet menu (app.exit).
                    "pet" => api.prevent_close(),
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// On Windows the dedicated 32px tray image is used; the default window icon
/// is a 256px image that Windows shrinks to 16px for the notification area.
fn tray_icon(app: &tauri::App) -> tauri::image::Image<'static> {
    #[cfg(windows)]
    {
        if let Ok(img) = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png")) {
            return img;
        }
    }
    app.default_window_icon().cloned().unwrap().to_owned()
}

/// skipTaskbar only removes the taskbar button; the window still shows in
/// Alt+Tab / Task View unless it is a tool window.
#[cfg(windows)]
fn hide_from_alt_tab(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_APPWINDOW, WS_EX_TOOLWINDOW,
    };
    if let Ok(hwnd) = window.hwnd() {
        let h = hwnd.0 as windows_sys::Win32::Foundation::HWND;
        unsafe {
            let style = GetWindowLongPtrW(h, GWL_EXSTYLE);
            let style = (style | WS_EX_TOOLWINDOW as isize) & !(WS_EX_APPWINDOW as isize);
            SetWindowLongPtrW(h, GWL_EXSTYLE, style);
        }
    }
}
