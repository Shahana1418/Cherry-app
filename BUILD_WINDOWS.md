# Building Cherry Precision App for Windows (.exe)

This project uses **GitHub Actions** to build a standalone Windows installer. The resulting `.exe` is a self-contained NSIS installer — no Node.js, Rust, or development tools are needed on the target machine.

## How to Get the .exe

### Step 1: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/cherry-precision-app.git
git push -u origin main
```

### Step 2: Run the Build

The workflow runs **automatically on push** to `main`/`master`. You can also trigger it manually:

1. Go to your GitHub repo → **Actions** tab
2. Click **"Build Windows Installer"** on the left
3. Click **"Run workflow"** → **"Run workflow"**

### Step 3: Download the .exe

1. Once the workflow completes (≈5–10 minutes), click on the completed run
2. Scroll to **Artifacts** at the bottom
3. Download **`cherry-precision-windows-installer`**
4. Extract the zip — inside is your `.exe` installer

## What the Installer Includes

| Component | Bundled? |
|-----------|----------|
| Cherry Precision App executable | ✅ |
| WebView2 runtime (rendering engine) | ✅ Embedded |
| SQLite database engine | ✅ Compiled in |
| Serial port drivers | ✅ Compiled in |

**The user does NOT need to install anything else.** Just double-click the `.exe`, install, and run.

## Installing on Windows

1. Double-click the downloaded `.exe` installer
2. Follow the installation wizard
3. Launch "Cherry Precision Products" from the Start Menu or Desktop shortcut
4. The SQLite database (`cherry_precision.db`) is created automatically next to the executable

## Building Locally (on a Windows machine)

If you have a Windows machine with development tools:

```powershell
# Prerequisites: Node.js 20+, Rust (rustup.rs)
npm install
npx tauri build
```

The installer will be at: `src-tauri\target\release\bundle\nsis\cherry-precision-app_0.1.0_x64-setup.exe`
