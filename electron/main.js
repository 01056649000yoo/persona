import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { startServer, stopServer } from "../server.js";

const APP_PORT = 3030;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;

let mainWindow = null;
let isQuitting = false;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    title: "Persona Voice Lab",
    webPreferences: {
      preload: join(app.getAppPath(), "electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

async function ensureServerStarted() {
  await startServer(APP_PORT);
}

async function createDesktopLauncher() {
  const desktopDir = app.getPath("desktop");
  const launcherPath = join(desktopDir, "Persona Voice Lab.url");
  const iconPath = process.execPath.replace(/\\/g, "\\\\");
  const contents = [
    "[InternetShortcut]",
    `URL=${APP_URL}`,
    "IconIndex=0",
    `IconFile=${iconPath}`,
    "",
  ].join("\r\n");

  await access(desktopDir);
  await writeFile(launcherPath, contents, "utf-8");
  return launcherPath;
}

ipcMain.handle("desktop-shortcut:create", async () => {
  const shortcutPath = await createDesktopLauncher();
  return {
    shortcutPath,
    message: "바탕화면에 Windows 바로가기를 만들었어요.",
  };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.whenReady().then(async () => {
  mainWindow = createMainWindow();

  try {
    await ensureServerStarted();
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    dialog.showErrorBox(
      "앱 실행 실패",
      error instanceof Error ? error.message : "앱을 실행하지 못했습니다.",
    );
    app.quit();
  }
});

app.on("quit", () => {
  if (!isQuitting) return;
  stopServer().catch(() => {});
});
