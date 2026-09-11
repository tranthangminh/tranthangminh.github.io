# Auto Clicker by Max

A modern, lightweight, portable Windows Auto Clicker & Macro Automation tool. Built in C# .NET with zero installation required — just launch and use.

> **Privacy first:** Runs 100% locally. No network requests, no telemetry, no trackers.

---

## ✨ Features at a Glance

| Feature | Simple Mode | Asian Mode |
|---|---|---|
| Background click (mouse stays free) | ✅ | ✅ |
| Click at fixed coordinates | ✅ | ✅ |
| Click at current cursor position | ✅ | — |
| Action chains & sequences | — | ✅ |
| Pixel color detection (Wait/If/Change) | — | ✅ |
| Human-like random delay & jitter | ✅ | ✅ |
| Run multiple scripts concurrently | — | ✅ |
| Window-relative targeting | ✅ | ✅ |
| Keyboard simulation (keys, text) | — | ✅ |
| Drag & Drop simulation | — | ✅ |
| Scroll simulation | — | ✅ |

---

## 🖥️ System Requirements

| | Requirement |
|---|---|
| **OS** | Windows 10 / Windows 11 (64-bit recommended) |
| **Runtime** | .NET Framework 4.0 (pre-installed on Windows 10+) |
| **RAM** | ~20 MB |
| **Disk** | ~350 KB (single `.exe`, no installation) |
| **Permissions** | Standard user — no administrator rights needed |

---

## 🚀 Getting Started

1. Download `Auto Clicker by Max.exe`
2. Double-click to launch — no installation required
3. Pick a mode and start clicking

> **Windows SmartScreen notice:** Because this app simulates mouse & keyboard input via Win32 APIs, SmartScreen may show an "Unknown Publisher" warning on first launch.  
> Click **More info → Run anyway** — the file is 100% clean and has been submitted to [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) for review.

---

## 🎮 Two Modes

### Simple Mode
Minimal and ready to use immediately. Great for basic repetitive clicking tasks.

- Add a list of click coordinates via the **`+`** button or press **`Space`** to capture your current cursor position
- Set click interval, hold duration, mouse button, and stop condition (by count or countdown timer)
- Toggle **Free Mouse Mode** to click in the background without hijacking your cursor
- Lock clicks to a specific **Target Window** — coordinates auto-adjust if the window moves

### Asian Mode *(Advanced Macro Engine)*
Named "Asian" because it's complex :) Full macro scripting for heavy automation tasks.

- Build multi-step action sequences with an intuitive visual editor
- Supports: Left/Right/Middle Click, Double Click, Drag & Drop, Key Press, Type Text, Scroll, Delay
- **Pixel color conditions:**
  - `Wait Color` — pause execution until a pixel hits the target color
  - `If Color` — conditionally skip the next step based on pixel color
  - `Wait Change` — wait until a pixel changes from its initial color
- **Run Script** — call another script from within a script (macro chaining)
- **Batch edit** column headers to set Hold/Delay/Repeat/Action Type across all steps at once
- Organize multiple independent scripts in tabs — run them concurrently

---

## ⌨️ Hotkeys

| Hotkey | Action |
|---|---|
| `F6` | Start / Resume |
| `F7` or `Esc` | Stop |
| `Space` | Capture current cursor position (while app is focused) |

---

## 💡 Tips & Tricks

**1. Free Mouse Mode is the killer feature**  
Enable it to let the app click in the background while your physical mouse cursor remains completely free. Use it to run automations while browsing or working in other windows simultaneously.

**2. Window-relative targeting**  
Bind your click points to a specific application window. If you move or resize the target window, coordinates automatically recalculate — no need to redo your setup.

**3. Use Random Jitter + Random Delay to appear human**  
In both Simple and Asian Mode, enable `Jitter ±px` and `Interval ±ms` to randomize coordinates and timing. This significantly reduces the chance of being flagged by anti-bot systems in idle/clicker games.

**4. Color detection for dynamic UI**  
Use `Wait Color` before a click step to wait for a button or element to appear before clicking it. Combine with `If Color` to build conditional logic — e.g., "only click the loot button if the loot icon is green."

**5. Script chaining with Run Script**  
Create a "master script" that calls sub-scripts in sequence using the `Run Script` action. This keeps each script focused and reusable.

**6. Batch editing**  
Click any column header in Asian Mode (Hold, Delay, Repeat, Action Type, Target Window) to apply the same value to all steps at once — a huge time saver when setting up large scripts.

**7. Save & Load projects**  
Use the Save/Load buttons to export your scripts as `.json` files. Great for backing up configurations or sharing scripts with others.

---

## 🏗️ Build from Source

Requirements: Windows with .NET Framework 4.0 SDK installed.

```bat
git clone https://github.com/tranthangminh/auto-clicker-by-max.git
cd "Auto Clicker by Max"
build.bat
```

The build script automatically:
- Finds the C# compiler (`csc.exe`) on your system
- Bundles template files as embedded resources
- Embeds the application manifest
- Compiles all `.cs` files recursively
- Outputs `Auto Clicker by Max.exe` and copies it to the parent folder

---

## 📄 License

Personal use only. Not affiliated with any other Auto Clicker software.

---

## 💬 Feedback & Bug Reports

Found a bug or have a feature request? Open an [Issue](../../issues) or reach out directly.  
All feedback is welcome — this helps make the tool better for everyone!
