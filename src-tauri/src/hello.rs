use tauri::command;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::env;
use std::thread;
use std::time::Duration;
use serde_json::Value;
use tauri_plugin_shell::ShellExt;
use tokio::time::timeout;

async fn render_chess_animation() -> Result<String, String> {
    let current_dir: PathBuf = env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    let root_dir = current_dir.parent()
        .ok_or("Failed to get parent directory")?
        .to_path_buf();

    println!("Starting chess animation rendering...");
    println!("Working directory: {}", root_dir.display());
    
    let command_str = "npx remotion render remotion/index.ts Chess sample_exporting/chess-animation.mp4";
    println!("Command: {}", command_str);

    let (sender, receiver) = std::sync::mpsc::channel();
    
    thread::spawn(move || {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut cmd = Command::new("cmd");
            cmd.args(["/C", command_str]);
            cmd
        } else {
            let mut cmd = Command::new("sh");
            cmd.args(["-c", command_str]);
            cmd
        };

        cmd.current_dir(&root_dir);
        let result = cmd.output();
        let _ = sender.send(result);
    });

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
                        return Ok(stdout);
                    } else {
                        let error_msg = format!(
                            "Rendering failed with return code {:?}\nSTDERR: {}\nSTDOUT: {}",
                            output.status.code(), stderr, stdout
                        );
                        println!("{}", error_msg);
                        return Err(error_msg);
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to execute command: {}", e);
                    println!("{}", error_msg);
                    return Err(error_msg);
                }
            }
        }
        
        if start_time.elapsed() >= timeout_duration {
            let error_msg = "Rendering timed out after 5 minutes".to_string();
            println!("{}", error_msg);
            return Err(error_msg);
        }
        
        thread::sleep(Duration::from_millis(100));
    }
}

fn process_overlay_data(export_data: &Value) -> Result<(Vec<[f64; 2]>, Vec<[f64; 2]>, [f64; 2]), String> {
    let time_per_move = export_data.get("timePerMove")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.2);
    
    let timestamps = export_data.get("timestamps")
        .and_then(|v| v.as_array())
        .ok_or("No timestamps found in export data")?;
    
    let number_of_moves = timestamps.len();
    
    if number_of_moves == 0 {
        return Err("No timestamps found in export data".to_string());
    }
    
    let overlay_segs: Vec<[f64; 2]> = (0..number_of_moves)
        .map(|i| {
            let start = (i as f64 * time_per_move * 1000.0).round() / 1000.0;
            let end = ((i + 1) as f64 * time_per_move * 1000.0).round() / 1000.0;
            [start, end]
        })
        .collect();
    
    let mut timestamps_copy: Vec<f64> = timestamps
        .iter()
        .filter_map(|v| v.as_f64())
        .collect();
    
    timestamps_copy.push(7.0);
    
    let mut bg_segs: Vec<[f64; 2]> = (1..=number_of_moves)
        .map(|i| {
            // Fixed: Match Python logic - subtract time_per_move and round to 3 decimal places
            let start = ((timestamps_copy[i-1] - time_per_move) * 1000.0).round() / 1000.0;
            let end = timestamps_copy[i];
            [start, end]
        })
        .collect();
    
    if !bg_segs.is_empty() {
        // Fixed: Match Python logic - add time_per_move and round to 3 decimal places
        bg_segs[0][0] = ((bg_segs[0][0] + time_per_move) * 1000.0).round() / 1000.0;
    }
    
    let x_offset = export_data.get("x_offset")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    
    let y_offset = export_data.get("y_offset")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    
    let xy_offset = [x_offset, y_offset];
    
    println!("Processed overlay data: {} moves", number_of_moves);
    println!("Overlay segments: {:?}", overlay_segs);
    println!("Background segments: {:?}", bg_segs);
    println!("XY Offset: {:?}", xy_offset);
    
    Ok((overlay_segs, bg_segs, xy_offset))
}

fn get_multiple_overlay_command(
    overlay_segs: &[[f64; 2]], 
    bg_segs: &[[f64; 2]], 
    xy_offset: Option<[f64; 2]>,
    background_file: Option<&str>,
    overlay_file: Option<&str>,
    output_file: Option<&str>
) -> Result<Vec<String>, String> {
    if overlay_segs.len() != bg_segs.len() {
        return Err("The number of overlay segments must match the number of background segments.".to_string());
    }

    let xy_offset = xy_offset.unwrap_or([0.0, 0.0]);
    
    // Get the root directory (parent of src-tauri)
    let current_dir = env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    let root_dir = current_dir.parent()
        .ok_or("Failed to get parent directory")?;
    
    // Build absolute paths
    let background_file = background_file
        .map(|f| root_dir.join("sample_exporting").join(f).to_string_lossy().to_string())
        .unwrap_or_else(|| root_dir.join("sample_exporting").join("background.mp4").to_string_lossy().to_string());
    let overlay_file = overlay_file
        .map(|f| root_dir.join("sample_exporting").join(f).to_string_lossy().to_string())
        .unwrap_or_else(|| root_dir.join("sample_exporting").join("chess-animation.mp4").to_string_lossy().to_string());
    let output_file = output_file
        .map(|f| root_dir.join("sample_exporting").join(f).to_string_lossy().to_string())
        .unwrap_or_else(|| root_dir.join("sample_exporting").join("output.mp4").to_string_lossy().to_string());

    println!("Using absolute paths:");
    println!("  Background: {}", background_file);
    println!("  Overlay: {}", overlay_file);
    println!("  Output: {}", output_file);

    let x_pos = xy_offset[0];
    let y_pos = xy_offset[1];

    // Build a vector of arguments
    let mut args: Vec<String> = Vec::new();

    // Background input
    args.push("-i".to_string());
    args.push(background_file.to_string());
    
    // Overlay inputs
    for seg in overlay_segs {
        let start = seg[0];
        let end = seg[1];
        let duration = end - start;
        args.push("-ss".to_string());
        args.push(start.to_string());
        args.push("-t".to_string());
        args.push(duration.to_string());
        args.push("-i".to_string());
        args.push(overlay_file.to_string());
    }
    
    // Build the filter complex chain
    let mut filter_complex_parts = Vec::new();
    let mut last_video_stream = "[0:v]".to_string();

    for (i, (overlay_seg, bg_seg)) in overlay_segs.iter().zip(bg_segs.iter()).enumerate() {
        let overlay_start = overlay_seg[0];
        let overlay_end = overlay_seg[1];
        let bg_start = bg_seg[0];
        let bg_end = bg_seg[1];

        let overlay_duration = overlay_end - overlay_start;
        let bg_overlay_duration = bg_end - bg_start;

        let current_overlay_stream = format!("[{}:v]", i + 1);
        let processed_overlay_stream = format!("[processed_overlay_{}]", i + 1);
        let output_stream_label = format!("[v_out_{}]", i + 1);

        // Build overlay processing filters
        let mut overlay_filters = Vec::new();
        let freeze_duration = bg_overlay_duration - overlay_duration;
        
        if freeze_duration > 0.001 {
            overlay_filters.push(format!("tpad=stop_mode=clone:stop_duration={}", freeze_duration));
        }
        
        overlay_filters.push(format!("setpts=PTS+{}/TB", bg_start));

        // Create the overlay processing filter chain
        let overlay_filter_chain = if overlay_filters.is_empty() {
            format!("{}{}", current_overlay_stream, processed_overlay_stream)
        } else {
            format!("{}{}{}",
                current_overlay_stream,
                overlay_filters.join(","),
                processed_overlay_stream
            )
        };

        filter_complex_parts.push(overlay_filter_chain);

        // Create the overlay application filter
        let overlay_application = format!(
            "{}{}overlay={}:{}:enable='between(t,{},{})'{}", 
            last_video_stream,
            processed_overlay_stream,
            x_pos,
            y_pos,
            bg_start,
            bg_end,
            output_stream_label
        );
        filter_complex_parts.push(overlay_application);
        
        last_video_stream = output_stream_label;
    }

    let full_filter_complex = filter_complex_parts.join(";");

    // Add remaining arguments to the vector
    args.push("-filter_complex".to_string());
    args.push(full_filter_complex);
    args.push("-map".to_string());
    args.push(last_video_stream);
    args.push("-map".to_string());
    args.push("0:a?".to_string());
    args.push("-c:a".to_string());
    args.push("copy".to_string());
    args.push("-y".to_string());
    args.push(output_file.to_string());

    Ok(args)
}

#[derive(Debug, serde::Serialize)]
struct FFmpegResult {
    success: bool,
    output: String,
    error: String,
    return_code: Option<i32>,
}

async fn execute_ffmpeg_command(app: tauri::AppHandle, args: &[String]) -> Result<FFmpegResult, String> {
    // Log the current working directory
    match env::current_dir() {
        Ok(current_dir) => {
            println!("FFmpeg executing from directory: {}", current_dir.display());
        }
        Err(e) => {
            println!("Failed to get current directory for FFmpeg: {}", e);
        }
    }
    
    println!("Executing ffmpeg with arguments: {:?}", args);
    
    // Create the sidecar command
    let sidecar_command = app.shell().sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create FFmpeg sidecar command: {}", e))?;
    
    // Execute the command with a timeout
    let execution_future = sidecar_command
        .args(args) // Pass the arguments slice directly
        .output();
    
    let timeout_duration = Duration::from_secs(300);
    
    match timeout(timeout_duration, execution_future).await {
        Ok(result) => {
            match result {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                    let return_code = output.status.code();
                    let success = output.status.success();
                    
                    println!("FFmpeg execution completed:");
                    println!("Success: {}", success);
                    println!("Return code: {:?}", return_code);
                    
                    // Print FULL stderr output - this is key for debugging
                    if !stderr.is_empty() {
                        println!("=== FULL STDERR OUTPUT ===");
                        println!("{}", stderr);
                        println!("=== END STDERR OUTPUT ===");
                    }
                    
                    if !stdout.is_empty() {
                        println!("=== FULL STDOUT OUTPUT ===");
                        println!("{}", stdout);
                        println!("=== END STDOUT OUTPUT ===");
                    }
                    
                    Ok(FFmpegResult {
                        success,
                        output: stdout,
                        error: stderr,
                        return_code,
                    })
                }
                Err(e) => {
                    let error_msg = format!("Failed to execute FFmpeg command: {}", e);
                    println!("{}", error_msg);
                    Ok(FFmpegResult {
                        success: false,
                        output: String::new(),
                        error: error_msg,
                        return_code: None,
                    })
                }
            }
        }
        Err(_) => {
            let error_msg = "FFmpeg command timed out after 5 minutes".to_string();
            println!("{}", error_msg);
            Ok(FFmpegResult {
                success: false,
                output: String::new(),
                error: error_msg,
                return_code: Some(-1),
            })
        }
    }
}

#[command]
pub async fn export(app: tauri::AppHandle, data: Value) -> Result<String, String> {
    // First, write the JSON data to file
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    
    let mut path = PathBuf::from("..");
    path.push("remotion");
    path.push("export.json");
    
    let path_clone = path.clone();
    let content_clone = content.clone();
    
    let (sender, receiver) = std::sync::mpsc::channel();
    thread::spawn(move || {
        let result = fs::write(&path_clone, content_clone);
        let _ = sender.send(result);
    });
    
    match receiver.recv() {
        Ok(Ok(_)) => println!("File written successfully to {:?}", path),
        Ok(Err(e)) => return Err(format!("Failed to write file to {:?}: {}", path, e)),
        Err(_) => return Err("File write operation failed".to_string()),
    }
    
    // Now render the chess animation
    println!("Starting chess animation rendering...");
    if let Err(e) = render_chess_animation().await {
        let error_msg = format!("Rendering failed: {}", e);
        println!("{}", error_msg);
        return Err(error_msg);
    }
    println!("Chess animation rendered successfully!");

    println!("Processing overlay data...");
    match process_overlay_data(&data) {
        Ok((overlay_segs, bg_segs, xy_offset)) => {
            println!("Overlay data processed successfully!");
            
            match get_multiple_overlay_command(
                &overlay_segs,
                &bg_segs,
                Some(xy_offset),
                None,
                None,
                None
            ) {
                Ok(ffmpeg_args) => {
                    println!("Generated FFmpeg arguments: {:?}", ffmpeg_args);
                    
                    match execute_ffmpeg_command(app, &ffmpeg_args).await {
                        Ok(ffmpeg_result) => {
                            if ffmpeg_result.success {
                                println!("FFmpeg command executed successfully!");
                                
                                let result = serde_json::json!({
                                    "status": "success",
                                    "overlay_segments": overlay_segs,
                                    "background_segments": bg_segs,
                                    "xy_offset": xy_offset,
                                    "ffmpeg_command": format!("ffmpeg {}", ffmpeg_args.join(" ")),
                                    "ffmpeg_output": ffmpeg_result.output,
                                    "message": "Chess animation rendered, overlay data processed, and FFmpeg command executed successfully"
                                });
                                
                                Ok(result.to_string())
                            } else {
                                let error_msg = format!(
                                    "FFmpeg command failed: {}\nReturn code: {:?}",
                                    ffmpeg_result.error,
                                    ffmpeg_result.return_code,
                                );
                                println!("{}", error_msg);
                                Err(error_msg)
                            }
                        }
                        Err(e) => {
                            let error_msg = format!("Failed to execute FFmpeg command: {}", e);
                            println!("{}", error_msg);
                            Err(error_msg)
                        }
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to generate FFmpeg command: {}", e);
                    println!("{}", error_msg);
                    Err(error_msg)
                }
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to process overlay data: {}", e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}