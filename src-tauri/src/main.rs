// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use tauri::command;
use serde_json;

// Import and initialize Tauri Dialog plugin (v2)
use tauri_plugin_dialog::init as dialog_init;

#[derive(serde::Deserialize)]
pub enum OsEnvironment {
    Windows,
    Wsl,
}

impl Default for OsEnvironment {
    fn default() -> Self {
        OsEnvironment::Windows
    }
}

#[command]
fn run_python_script(
    script: String, 
    cli_args: Vec<String>,
    os_env: Option<OsEnvironment>,
    json_output: Option<bool>
) -> Result<serde_json::Value, String> {
    let os_env = os_env.unwrap_or_default();
    let json_output = json_output.unwrap_or(false);
    
    // Validate script name
    if !script.ends_with(".py") || script.contains('/') || script.contains('\\') {
        return Err("Invalid script name.".to_string());
    }

    let output = match os_env {
        OsEnvironment::Windows => run_windows_script(script, cli_args)?,
        OsEnvironment::Wsl => run_wsl_script(script, cli_args)?,
    };

    // If json_output is true, try to parse the output as JSON
    if json_output {
        match serde_json::from_str(&output) {
            Ok(json_value) => Ok(json_value),
            Err(e) => Err(format!("Failed to parse JSON output: {}", e)),
        }
    } else {
        // Return the raw string output wrapped in a JSON string value
        Ok(serde_json::Value::String(output))
    }
}

fn run_windows_script(script: String, cli_args: Vec<String>) -> Result<String, String> {
    let windows_path = r"C:\Users\User\Documents\boardcast\py-util";
    
    // For Windows, we'll use cmd to run the script
    let mut command = Command::new("cmd");
    command.args(&["/C", "cd", "/D", windows_path, "&&", "pipenv", "run", "python", &script]);
    
    // Add CLI arguments
    for arg in cli_args {
        command.arg(arg);
    }

    let output = command.output().map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn run_wsl_script(script: String, cli_args: Vec<String>) -> Result<String, String> {
    let wsl_path = "/mnt/c/Users/User/Documents/sample_script";

    // Escape and format CLI arguments for WSL
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