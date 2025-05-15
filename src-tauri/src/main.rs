// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::command;

// Import and initialize Tauri Dialog plugin (v2)
use tauri_plugin_dialog::init as dialog_init;

#[command]
fn run_python_script(script: String, cli_args: Vec<String>) -> Result<String, String> {
    let wsl_path = "/mnt/c/Users/User/Documents/sample_script";

    // Validate script name
    if !script.ends_with(".py") || script.contains('/') || script.contains('\\') {
        return Err("Invalid script name.".to_string());
    }

    // Escape and format CLI arguments
    let args_str = cli_args
        .iter()
        .map(|arg| format!("'{}'", arg.replace('\'', "'\\''")))
        .collect::<Vec<String>>()
        .join(" ");

    // Construct WSL command
    let command = format!(
        "cd '{}' && pipenv run python {} {}",
        wsl_path, script, args_str
    );

    // Execute the command in WSL
    let output = Command::new("wsl")
        .args(&["bash", "-c", &command])
        .output()
        .map_err(|e| e.to_string())?;

    // Return stdout if successful, stderr otherwise
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(dialog_init()) // Initialize dialog plugin
        .invoke_handler(tauri::generate_handler![run_python_script])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
