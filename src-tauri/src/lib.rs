use serde::Serialize;
use serialport::SerialPortType;
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};
use rusqlite::{Connection, params};
use chrono::NaiveDateTime;

// App State holding the SQLite DB connection
struct AppState {
    db: Mutex<Connection>,
}

// Global flag to stop the serial reading thread
static READING_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Clone)]
struct SerialPortInfo {
    name: String,
    port_type: String,
}

#[derive(Debug, Serialize, Clone)]
struct ParsedPacket {
    date: String,
    time: String,
    reading: String,
    offset: String,
    status: String,
    airgauge_id: String,
    channel: String,
    drawing_value: String,
    comp_id: String,
    employee_id: String,
    machine_id: String,
    raw: String,
}

/// List all available serial ports
#[tauri::command]
fn list_serial_ports() -> Result<Vec<SerialPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    let result: Vec<SerialPortInfo> = ports
        .into_iter()
        .map(|p| {
            let port_type = match &p.port_type {
                SerialPortType::UsbPort(info) => {
                    format!(
                        "USB ({})",
                        info.product.as_deref().unwrap_or("Unknown")
                    )
                }
                SerialPortType::PciPort => "PCI".to_string(),
                SerialPortType::BluetoothPort => "Bluetooth".to_string(),
                SerialPortType::Unknown => "Unknown".to_string(),
            };
            SerialPortInfo {
                name: p.port_name,
                port_type,
            }
        })
        .collect();
    Ok(result)
}

/// Automatically find the COM port belonging to an ESP32 or ESP8266
#[tauri::command]
fn auto_detect_esp_port() -> Result<String, String> {
    let ports = serialport::available_ports().map_err(|e| e.to_string())?;
    
    // ESP USB hardware VID/PID signatures (comprehensive list)
    let esp_usb_ids: Vec<(u16, u16)> = vec![
        // ── CH340 / CH341 family (most common on cheap ESP32 boards)
        (0x1A86, 0x7523), // CH340
        (0x1A86, 0x7522), // CH340K
        (0x1A86, 0x5523), // CH341A
        (0x1A86, 0x55D4), // CH9102F
        (0x1A86, 0x55D3), // CH9102X
        (0x1A86, 0x55D5), // CH343P
        (0x1A86, 0xE523), // CH330
        // ── Silicon Labs CP210x family
        (0x10C4, 0xEA60), // CP2102 / CP2102N
        (0x10C4, 0xEA70), // CP2105
        (0x10C4, 0xEA80), // CP2108
        // ── FTDI family
        (0x0403, 0x6001), // FT232RL
        (0x0403, 0x6010), // FT2232
        (0x0403, 0x6011), // FT4232
        (0x0403, 0x6014), // FT232H
        (0x0403, 0x6015), // FT-X series (FT231X, FT230X)
        // ── Espressif native USB (ESP32-S2, S3, C3, C6, H2)
        (0x303A, 0x1001), // ESP32-S3 native USB CDC
        (0x303A, 0x0002), // ESP32 USB JTAG / UART
        (0x303A, 0x1002), // ESP32-S2 native USB
        (0x303A, 0x0003), // ESP32-C3 USB serial
        (0x303A, 0x0004), // ESP32-C6 USB serial
        (0x303A, 0x0005), // ESP32-H2 USB serial
        (0x303A, 0x4001), // ESP32-S3 DFU
        // ── WCH (other Chinese USB-serial chips on some clones)
        (0x4348, 0x5523), // WCH CH341A alt
        (0x1A86, 0x7524), // CH341 serial
    ];

    // First pass: try to find a known ESP USB VID/PID
    let mut first_usb_port: Option<String> = None;
    for p in &ports {
        if let SerialPortType::UsbPort(info) = &p.port_type {
            // Remember the first USB serial port as fallback
            if first_usb_port.is_none() {
                first_usb_port = Some(p.port_name.clone());
            }
            if esp_usb_ids.contains(&(info.vid, info.pid)) {
                return Ok(p.port_name.clone());
            }
        }
    }

    // Fallback: if no known VID/PID matched but there IS a USB serial port, use it
    if let Some(port_name) = first_usb_port {
        return Ok(port_name);
    }
    
    Err("No compatible ESP USB hardware detected.".to_string())
}

/// Parse a single *..# packet into structured fields
/// Field positions (1-indexed inside *..#):
///   Hours=1,2  Minutes=3,4  Seconds=5,6
///   Date=8,9   Month=10,11  Year=12,13
///   AirGauge ID=14,15,16   Channel=17,18   Offset=19,20
///   Drawing Value=22-28 (7 chars, decimal after 3rd)
///   Reading=31-37 (7 chars, decimal after 3rd)
///   Status=38 (A=ACCEPTED, B=REJECTED, C=REWORK)
///   Comp ID=39-48 (10 chars)   Employee ID=49-51   Machine ID=52,53
fn parse_packet(raw: &str) -> Option<ParsedPacket> {
    let trimmed = raw.trim();
    if !trimmed.starts_with('*') || !trimmed.ends_with('#') {
        return None;
    }

    // Strip * and #
    let inner = &trimmed[1..trimmed.len() - 1];

    // Need at least 53 characters for all fields
    if inner.len() < 53 {
        return None;
    }

    // Time: positions 1-6 (0-indexed: 0..6)
    let hh = &inner[0..2];
    let mm = &inner[2..4];
    let ss = &inner[4..6];
    let time = format!("{}:{}:{}", hh, mm, ss);

    // Date: positions 8-13 (0-indexed: 7..13)
    let dd = &inner[7..9];
    let month = &inner[9..11];
    let yy = &inner[11..13];
    let date = format!("{}/{}/{}", dd, month, yy);

    // AirGauge ID: positions 14-16 (0-indexed: 13..16) — last 3 digits, treat as number
    let ag_raw = &inner[13..16];
    let airgauge_id = ag_raw
        .trim_start_matches('0')
        .to_string();
    let airgauge_id = if airgauge_id.is_empty() {
        "0".to_string()
    } else {
        airgauge_id
    };

    // Channel: positions 17-18 (0-indexed: 16..18)
    let ch_raw = &inner[16..18];
    let channel = ch_raw
        .trim_start_matches('0')
        .to_string();
    let channel = if channel.is_empty() {
        "0".to_string()
    } else {
        channel
    };

    // Offset value: positions 19-20 (0-indexed: 18..20) — strip leading zeros
    let offset_raw = &inner[18..20];
    let offset = offset_raw
        .trim_start_matches('0')
        .to_string();
    let offset = if offset.is_empty() {
        "0".to_string()
    } else {
        offset
    };

    // Drawing value: positions 22-28 (0-indexed: 21..28, 7 chars)
    // Insert decimal after 3rd digit: e.g. "0001000" -> "000.1000"
    let drawing_raw = &inner[21..28];
    let drawing_value = format!("{}.{}", &drawing_raw[0..3], &drawing_raw[3..7]);

    // Reading: positions 31-37 (0-indexed: 30..37, 7 chars)
    // Insert decimal after 3rd digit: e.g. "0111000" -> "011.1000"
    let reading_raw = &inner[30..37];
    let reading = format!("{}.{}", &reading_raw[0..3], &reading_raw[3..7]);

    // Status: position 38 (0-indexed: 37)
    let status_char = inner.chars().nth(37).unwrap_or('?');
    let status = match status_char {
        'A' => "ACCEPTED".to_string(),
        'B' => "REJECTED".to_string(),
        'C' => "REWORK".to_string(),
        _ => format!("{}", status_char),
    };

    // Component ID: positions 39-48 (0-indexed: 38..48, 10 chars)
    let comp_id = inner[38..48].trim().to_string();

    // Employee ID: positions 49-51 (0-indexed: 48..51, 3 chars)
    let employee_id = inner[48..51].trim().to_string();

    // Machine ID: positions 52-53 (0-indexed: 51..53, 2 chars)
    let machine_id = inner[51..53].trim().to_string();

    Some(ParsedPacket {
        date,
        time,
        reading,
        offset,
        status,
        airgauge_id,
        channel,
        drawing_value,
        comp_id,
        employee_id,
        machine_id,
        raw: raw.to_string(),
    })
}

/// Start reading serial data in a background thread
#[tauri::command]
fn start_serial_reading(
    app_handle: tauri::AppHandle,
    port_name: String,
    baud_rate: u32,
) -> Result<String, String> {
    // If already reading, stop first
    if READING_ACTIVE.load(Ordering::SeqCst) {
        READING_ACTIVE.store(false, Ordering::SeqCst);
        std::thread::sleep(Duration::from_millis(300));
    }

    // Try to open the port
    let port = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(500))
        .open()
        .map_err(|e| format!("Failed to open {}: {}", port_name, e))?;

    READING_ACTIVE.store(true, Ordering::SeqCst);

    // Spawn background reading thread
    std::thread::spawn(move || {
        let mut port = port;
        let mut buffer = String::new();
        let mut byte_buf = [0u8; 1024];

        // --- HARDWARE HANDSHAKE ---
        let _ = port.write(b"PING\n");
        std::thread::sleep(Duration::from_millis(200));
        let mut trash = [0u8; 128];
        let _ = port.read(&mut trash); // flush any incoming string from ESP
        let _ = port.write(b"START\n");

        while READING_ACTIVE.load(Ordering::SeqCst) {
            match port.read(&mut byte_buf) {
                Ok(n) if n > 0 => {
                    let chunk = String::from_utf8_lossy(&byte_buf[..n]);
                    buffer.push_str(&chunk);

                    // Extract complete packets: * ... #
                    loop {
                        let start = buffer.find('*');
                        let end = buffer.find('#');

                        match (start, end) {
                            (Some(s), Some(e)) if e > s => {
                                let packet = buffer[s..=e].to_string();
                                buffer = buffer[e + 1..].to_string();

                                if let Some(parsed) = parse_packet(&packet) {
                                    // 1. Emit live data to the front UI immediately
                                    let _ = app_handle.emit("serial-data", parsed.clone());

                                    // 2. Archive to permanent SQLite database immediately
                                    // "15/05/26 14:30:00" -> Unix Timestamp
                                    let datetime_str = format!("{} {}", parsed.date, parsed.time);
                                    let timestamp = NaiveDateTime::parse_from_str(&datetime_str, "%d/%m/%y %H:%M:%S")
                                        .map(|dt| dt.and_local_timezone(chrono::Local)
                                            .single()
                                            .map(|ldt| ldt.timestamp())
                                            .unwrap_or_else(|| dt.and_utc().timestamp()))
                                        .unwrap_or(0);

                                    {
                                        let state = app_handle.state::<AppState>();
                                        let tmp = std::env::temp_dir();
                                        let _ = std::fs::write(tmp.join("cherry_debug_log.txt"), "1. Acquired state");
                                        let locked = state.db.lock();
                                        if let Ok(db) = locked {
                                            let _ = std::fs::write(tmp.join("cherry_debug_log.txt"), "2. Acquired lock");
                                            match db.execute(
                                                "INSERT INTO readings (date, time, reading, offset, status, airgauge_id, channel, drawing_value, comp_id, employee_id, machine_id, raw, timestamp)
                                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                                                params![
                                                    parsed.date, parsed.time, parsed.reading, parsed.offset, parsed.status,
                                                    parsed.airgauge_id, parsed.channel, parsed.drawing_value, parsed.comp_id,
                                                    parsed.employee_id, parsed.machine_id, parsed.raw, timestamp
                                                ]
                                            ) {
                                                Ok(_) => {
                                                    let _ = std::fs::write(tmp.join("cherry_debug_log.txt"), format!("3. Inserted OK, count: 1"));
                                                },
                                                Err(e) => {
                                                    let _ = std::fs::write(tmp.join("cherry_sqlite_error.txt"), format!("SQL INSERT ERROR: {}", e));
                                                }
                                            }
                                        } else {
                                            let _ = std::fs::write(tmp.join("cherry_debug_log.txt"), "2. Failed to acquire lock - PoisonError!");
                                        }
                                    }
                                }
                            }
                            (Some(s), Some(e)) if e <= s => {
                                // # before * means garbage, skip to *
                                buffer = buffer[s..].to_string();
                                break;
                            }
                            _ => break,
                        }
                    }

                    // Prevent buffer from growing too large
                    if buffer.len() > 10000 {
                        if let Some(last_star) = buffer.rfind('*') {
                            buffer = buffer[last_star..].to_string();
                        } else {
                            buffer.clear();
                        }
                    }
                }
                Ok(_) => {
                    // No data, small sleep
                    std::thread::sleep(Duration::from_millis(50));
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // Timeout is normal, continue
                    continue;
                }
                Err(e) => {
                    let _ = app_handle.emit("serial-error", e.to_string());
                    break;
                }
            }
        }

        // --- HARDWARE HANDSHAKE END ---
        let _ = port.write(b"STOP\n");
        std::thread::sleep(Duration::from_millis(150)); // let it flush

        READING_ACTIVE.store(false, Ordering::SeqCst);
        let _ = app_handle.emit("serial-disconnected", "Port closed");
    });

    Ok(format!("Connected to {} at {} baud", port_name, baud_rate))
}

/// Stop reading serial data
#[tauri::command]
fn stop_serial_reading() -> Result<String, String> {
    READING_ACTIVE.store(false, Ordering::SeqCst);
    Ok("Disconnected".to_string())
}

/// Check if serial reading is active
#[tauri::command]
fn is_serial_reading() -> bool {
    READING_ACTIVE.load(Ordering::SeqCst)
}

/// Save data into the SQLite database
#[tauri::command]
fn save_data(state: tauri::State<AppState>, key: String, payload: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO store (key, payload) VALUES (?1, ?2) 
         ON CONFLICT(key) DO UPDATE SET payload = ?2",
        params![key, payload],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Load data from the SQLite database
#[tauri::command]
fn load_data(state: tauri::State<AppState>, key: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db
        .prepare("SELECT payload FROM store WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let payload: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(payload)
    } else {
        Ok("".to_string())
    }
}

/// Query historical hardware readings spanning a Unix Date/Time array
#[tauri::command]
fn fetch_readings(state: tauri::State<AppState>, start_ts: i64, end_ts: i64) -> Result<Vec<ParsedPacket>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = db.prepare(
        "SELECT date, time, reading, offset, status, airgauge_id, channel, drawing_value, comp_id, employee_id, machine_id, raw 
         FROM readings 
         WHERE timestamp >= ?1 AND timestamp <= ?2
         ORDER BY timestamp DESC"
    ).map_err(|e| e.to_string())?;

    let iter = stmt.query_map(params![start_ts, end_ts], |row| {
        Ok(ParsedPacket {
            date: row.get(0)?,
            time: row.get(1)?,
            reading: row.get(2)?,
            offset: row.get(3)?,
            status: row.get(4)?,
            airgauge_id: row.get(5)?,
            channel: row.get(6)?,
            drawing_value: row.get(7)?,
            comp_id: row.get(8)?,
            employee_id: row.get(9)?,
            machine_id: row.get(10)?,
            raw: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in iter {
        if let Ok(packet) = row {
            results.push(packet);
        }
    }
    
    Ok(results)
}

/// Bulk insert readings from USB file upload
#[tauri::command]
fn bulk_insert_readings(state: tauri::State<AppState>, json_payload: String) -> Result<String, String> {
    let rows: Vec<serde_json::Value> = serde_json::from_str(&json_payload)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    let db = state.db.lock().map_err(|e| e.to_string())?;
    
    // Use a transaction for performance on bulk inserts
    db.execute("BEGIN", []).map_err(|e| e.to_string())?;

    let mut inserted = 0u64;
    for row in &rows {
        let date = row["date"].as_str().unwrap_or("");
        let time = row["time"].as_str().unwrap_or("");
        let reading = row["reading"].as_str().unwrap_or("");
        let offset = row["offset"].as_str().unwrap_or("0");
        let status = row["status"].as_str().unwrap_or("");
        let airgauge_id = row["airgauge_id"].as_str().unwrap_or("0");
        let channel = row["channel"].as_str().unwrap_or("0");
        let drawing = row["drawing"].as_str().unwrap_or("");
        let comp_id = row["comp_id"].as_str().unwrap_or("");
        let employee_id = row["employee_id"].as_str().unwrap_or("");
        let machine_id = row["machine_id"].as_str().unwrap_or("");
        let raw = row["raw"].as_str().unwrap_or("");

        // Attempt to build a unix timestamp from date + time
        let datetime_str = format!("{} {}", date, time);
        let timestamp = NaiveDateTime::parse_from_str(&datetime_str, "%d/%m/%y %H:%M:%S")
            .map(|dt| dt.and_local_timezone(chrono::Local)
                .single()
                .map(|ldt| ldt.timestamp())
                .unwrap_or_else(|| dt.and_utc().timestamp()))
            .unwrap_or(0);

        match db.execute(
            "INSERT INTO readings (date, time, reading, offset, status, airgauge_id, channel, drawing_value, comp_id, employee_id, machine_id, raw, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![date, time, reading, offset, status, airgauge_id, channel, drawing, comp_id, employee_id, machine_id, raw, timestamp]
        ) {
            Ok(_) => inserted += 1,
            Err(e) => {
                let _ = db.execute("ROLLBACK", []);
                return Err(format!("Insert error at row {}: {}", inserted + 1, e));
            }
        }
    }

    db.execute("COMMIT", []).map_err(|e| e.to_string())?;
    Ok(format!("Inserted {} records", inserted))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize SQLite Database
    // Use the directory where the executable lives so the DB is always beside the app
    let db_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("cherry_precision.db")))
        .unwrap_or_else(|| std::path::PathBuf::from("cherry_precision.db"));
    let db = Connection::open(&db_path)
        .expect("Failed to open SQLite database cherry_precision.db");
    
    db.execute(
        "CREATE TABLE IF NOT EXISTS store (
            key TEXT PRIMARY KEY,
            payload TEXT NOT NULL
        )",
        [],
    )
    .expect("Failed to create store SQLite table");

    db.execute(
        "CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            time TEXT,
            reading TEXT,
            offset TEXT,
            status TEXT,
            airgauge_id TEXT,
            channel TEXT,
            drawing_value TEXT,
            comp_id TEXT,
            employee_id TEXT,
            machine_id TEXT,
            raw TEXT,
            timestamp INTEGER
        )",
        [],
    )
    .expect("Failed to create readings SQLite table");

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_serial_ports,
            auto_detect_esp_port,
            start_serial_reading,
            stop_serial_reading,
            is_serial_reading,
            save_data,
            load_data,
            fetch_readings,
            bulk_insert_readings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
