/**
 * My AI Mentor - Electron Preload Script
 * Secure boundary exposing safe desktop capabilities to renderer.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  
  // App Info & Data Paths
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // System
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
