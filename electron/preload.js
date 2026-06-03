import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("personaDesktop", {
  createShortcut: () => ipcRenderer.invoke("desktop-shortcut:create"),
  isElectron: true,
});
