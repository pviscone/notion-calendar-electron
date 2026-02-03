#!/usr/bin/env node
const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendArgument("disable-gpu");
app.commandLine.appendSwitch("enable-features", "Notifications,NotificationTriggers");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const browserUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
app.userAgentFallback = browserUserAgent;

const soundAssetPath = path.join(__dirname, "assets", "notification.wav");
const soundTempPath = path.join(os.tmpdir(), "notion-calendar-electron.wav");

function getSoundSourcePath() {
  try {
    if (!fs.existsSync(soundAssetPath)) {
      return null;
    }
    const header = fs.readFileSync(soundAssetPath, { encoding: null, length: 12 });
    if (header && header.slice(0, 4).toString("ascii") === "RIFF") {
      return soundAssetPath;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function ensureSoundFile() {
  try {
    const sourcePath = getSoundSourcePath();
    if (sourcePath) {
      return sourcePath;
    }
    if (!fs.existsSync(soundTempPath)) {
      const base64 = fs.readFileSync(soundAssetPath, "utf8").trim();
      const buffer = Buffer.from(base64, "base64");
      fs.writeFileSync(soundTempPath, buffer);
    }
    return soundTempPath;
  } catch (error) {
    return null;
  }
}

function playNotificationSound() {
  const soundPath = ensureSoundFile();
  if (!soundPath) {
    return;
  }
  const tryPlay = (command, args) => {
    try {
      const child = spawn(command, args, { stdio: "ignore", detached: true });
      child.unref();
      return true;
    } catch (error) {
      return false;
    }
  };

  if (tryPlay("paplay", [soundPath])) {
    return;
  }
  tryPlay("aplay", [soundPath]);
}

app.whenReady().then(() => {
  console.log("App is ready");
  console.log("App on ready event");

  let win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: __dirname + "/preload.js",
      contextIsolation: false,
      autoplayPolicy: "no-user-gesture-required",
      nativeWindowOpen: true,
    }
  });

  win.loadURL("https://calendar.notion.so/", { userAgent: browserUserAgent });

  win.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "notifications") {
        return callback(true);
      }
      return callback(false);
    }
  );

  win.webContents.session.setPermissionCheckHandler(
    (webContents, permission) => {
      if (permission === "notifications") {
        return true;
      }
      return false;
    }
  );

  win.webContents.setWindowOpenHandler((details) => {
    if (
      details.url.includes("notion.so") ||
      details.url.includes("accounts.google.com") ||
      details.url.includes("oauth")
    ) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 600,
          height: 700,
          autoHideMenuBar: true,
        }
      };
    }
    require("electron").shell.openExternal(details.url);
    return {
      action: "deny",
    };
  });

  //win.webContents.openDevTools();

  win.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.setWindowOpenHandler((details) => {
      console.log(typeof details.url);
      if (
        details.url.includes("notion.so") ||
        details.url.includes("accounts.google.com") ||
        details.url.includes("oauth")
      ) {
        return { action: "allow" };
      }
      require("electron").shell.openExternal(details.url);
      return { action: "deny" };
    });
  });
});

ipcMain.on("notify", (event, payload) => {
  const title = payload?.title || "Notion Calendar";
  const options = payload?.options || {};
  const notification = new Notification({
    title,
    body: options.body || "",
    silent: false,
  });
  notification.show();
  playNotificationSound();
});