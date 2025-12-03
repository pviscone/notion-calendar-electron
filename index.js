#!/usr/bin/env node
const { app, BrowserWindow } = require("electron");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendArgument("disable-gpu");

app.whenReady().then(() => {
  console.log("App is ready");
  console.log("App on ready event");
  
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nativeWindowOpen: true,
    }
  });
  
  win.loadURL("https://calendar.notion.so/");
  
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