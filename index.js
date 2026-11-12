#!/usr/bin/env node
const { app, BrowserWindow, Notification, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendArgument("disable-gpu");
app.commandLine.appendSwitch("enable-features", "Notifications,NotificationTriggers");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const chromeMajor = (process.versions.chrome || "120.0.0.0").split(".")[0];
const browserUserAgent =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
app.userAgentFallback = browserUserAgent;

// Consistent client hints matching browserUserAgent; Chromium derives the real
// Sec-CH-UA* headers from its own brand list (Chromium/Electron), which Notion's
// browser compatibility check rejects.
const clientHintHeaders = {
  "User-Agent": browserUserAgent,
  "Sec-CH-UA": `"Not_A Brand";v="8", "Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}"`,
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": `"Windows"`,
  "Sec-CH-UA-Platform-Version": `"10.0.0"`,
  "Sec-CH-UA-Full-Version": `"${chromeMajor}.0.0.0"`,
  "Sec-CH-UA-Full-Version-List": `"Not_A Brand";v="8.0.0.0", "Chromium";v="${chromeMajor}.0.0.0", "Google Chrome";v="${chromeMajor}.0.0.0"`,
  "Sec-CH-UA-Arch": `"x86"`,
  "Sec-CH-UA-Bitness": `"64"`,
  "Sec-CH-UA-Model": `""`,
};

const soundTempPath = path.join(os.tmpdir(), "notion-calendar-electron.wav");

function getSoundAssetPath() {
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, "app.asar.unpacked", "assets", "notification.wav")
    );
    candidates.push(
      path.join(process.resourcesPath, "app", "assets", "notification.wav")
    );
  }
  candidates.push(path.join(__dirname, "assets", "notification.wav"));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getSoundSourcePath() {
  try {
    const soundAssetPath = getSoundAssetPath();
    if (!soundAssetPath || !fs.existsSync(soundAssetPath)) {
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

let win;
let tray;
let isQuitting = false;

const trayIconPath = path.join(__dirname, "icon.png");
const startInTray = !process.argv.includes("--no-start-in-tray");

function createTray() {
  if (tray) {
    return tray;
  }
  tray = new Tray(trayIconPath);
  tray.setToolTip("Notion Calendar");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!win) {
      return;
    }
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  return tray;
}

app.whenReady().then(() => {
  console.log("App is ready");
  console.log("App on ready event");

  createTray();

  win = new BrowserWindow({
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

  const ses = win.webContents.session;
  ses.setUserAgent(browserUserAgent);
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = {};
    for (const name of Object.keys(details.requestHeaders)) {
      if (!/^sec-ch-ua/i.test(name) && name.toLowerCase() !== "user-agent") {
        headers[name] = details.requestHeaders[name];
      }
    }
    Object.assign(headers, clientHintHeaders);
    callback({ requestHeaders: headers });
  });

  win.loadURL("https://calendar.notion.so/", { userAgent: browserUserAgent });

  if (startInTray) {
    win.hide();
  }

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

  win.on("close", (event) => {
    if (isQuitting) {
      return;
    }
    event.preventDefault();
    win.hide();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
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