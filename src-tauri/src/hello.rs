use tauri::command;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::env;
use std::thread;
use std::time::Duration;
use serde_json::Value;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderResult {
    pub success: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

async fn render_chess_animation() -> Result<RenderResult, String> {
    // Get the current working directory and navigate to project root
    let current_dir = env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    // Assuming we need to go up one level to reach project root
    let root_dir = current_dir.parent()
        .ok_or("Failed to get parent directory")?
        .to_path_buf();

    println!("Starting chess animation rendering...");
    println!("Working directory: {}", root_dir.display());
    
    let command_str = "npx remotion render remotion/index.ts Chess py-util/chess-animation.mp4";
    println!("Command: {}", command_str);

    // Execute the command in a separate thread to avoid blocking
    let (sender, receiver) = std::sync::mpsc::channel();
    
    thread::spawn(move || {
        // Create the command
        let mut cmd = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", command_str]);
            cmd
        } else {
            let mut cmd = Command::new("sh");
            cmd.args(["-c", command_str]);
            cmd
        };

        // Set working directory
        cmd.current_dir(&root_dir);

        // Execute the command
        let result = cmd.output();
        let _ = sender.send(result);
    });

    // Wait for the result with a timeout (polling approach)
    let timeout_duration = Duration::from_secs(300); // 5 minutes
    let start_time = std::time::Instant::now();
    
    loop {
        if let Ok(result) = receiver.try_recv() {
            match result {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    
                    if output.status.success() {
                        println!("Chess animation rendered successfully.");
                        return Ok(RenderResult {
                            success: true,
                            output: Some(stdout),
                            error: if stderr.is_empty() { None } else { Some(stderr) },
                        });
                    } else {
                        let error_msg = format!(
                            "Rendering failed with return code {:?}\nSTDERR: {}\nSTDOUT: {}",
                            output.status.code(), stderr, stdout
                        );
                        println!("{}", error_msg);
                        
                        return Ok(RenderResult {
                            success: false,
                            output: if stdout.is_empty() { None } else { Some(stdout) },
                            error: Some(error_msg),
                        });
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to execute command: {}", e);
                    println!("{}", error_msg);
                    
                    return Ok(RenderResult {
                        success: false,
                        output: None,
                        error: Some(error_msg),
                    });
                }
            }
        }
        
        if start_time.elapsed() >= timeout_duration {
            let error_msg = "Rendering timed out after 5 minutes".to_string();
            println!("{}", error_msg);
            
            return Ok(RenderResult {
                success: false,
                output: None,
                error: Some(error_msg),
            });
        }
        
        // Small delay to avoid busy waiting
        thread::sleep(Duration::from_millis(100));
    }
}

#[command]
pub async fn export(data: Value) -> Result<RenderResult, String> {
    // First, write the JSON data to file
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    
    let mut path = PathBuf::from("..");
    path.push("remotion");
    path.push("export.json");
    
    // Write file synchronously in a separate thread to avoid blocking
    let path_clone = path.clone();
    let content_clone = content.clone();
    
    let (sender, receiver) = std::sync::mpsc::channel();
    thread::spawn(move || {
        let result = fs::write(&path_clone, content_clone);
        let _ = sender.send(result);
    });
    
    // Wait for file write to complete
    match receiver.recv() {
        Ok(Ok(_)) => {
            println!("File written successfully to {:?}", path);
        }
        Ok(Err(e)) => {
            return Err(format!("Failed to write file to {:?}: {}", path, e));
        }
        Err(_) => {
            return Err("File write operation failed".to_string());
        }
    }
    
    // Now render the chess animation
    println!("Starting chess animation rendering...");
    match render_chess_animation().await {
        Ok(result) => {
            if result.success {
                println!("Export and rendering completed successfully!");
            } else {
                println!("Export completed but rendering failed: {:?}", result.error);
            }
            Ok(result)
        }
        Err(e) => {
            let error_msg = format!("Rendering failed: {}", e);
            println!("{}", error_msg);
            Ok(RenderResult {
                success: false,
                output: None,
                error: Some(error_msg),
            })
        }
    }
}