/**
 * My AI Mentor - Electron Main Process
 * Manages native desktop window, local loopback backend lifecycle, and secure IPC.
 */
const { app, BrowserWindow, shell, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure single instance of the application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let serverInstance = null;
let serverPort = null;

// Determine paths
const isDev = process.env.ELECTRON_DEV === 'true' || !app.isPackaged;
const userDataPath = app.getPath('userData');

// Set environment for local server
process.env.USER_DATA_PATH = userDataPath;
process.env.ELECTRON_APP = 'true';
process.env.NODE_ENV = isDev ? 'development' : 'production';
process.env.NO_AUTO_START = 'true';
process.env.HOST = '127.0.0.1';

// Get application icon path
function getIconPath() {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(process.resourcesPath || '', 'build/icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
  ];
  return possiblePaths.find(p => fs.existsSync(p)) || undefined;
}

// Start local Express + WebSocket server
async function startLocalServer() {
  if (isDev && process.env.DEV_SERVER_PORT) {
    serverPort = Number(process.env.DEV_SERVER_PORT);
    console.log(`[Desktop] Using existing dev server at http://127.0.0.1:${serverPort}`);
    return serverPort;
  }

  process.env.PORT = '0'; // Ephemeral port to avoid conflicts
  
  // Locate bundled server
  const serverPath = path.join(__dirname, '../dist-server/server.mjs');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Bundled server not found at: ${serverPath}. Please run npm run build:server first.`);
  }

  // Set dist path for static frontend
  process.env.DIST_PATH = path.join(__dirname, '../dist');

  console.log('[Desktop] Starting local in-process backend server...');
  const serverModule = await import(`file://${serverPath}`);
  const result = await serverModule.start();
  serverInstance = result.server;
  serverPort = result.port;
  console.log(`[Desktop] In-process server listening on http://127.0.0.1:${serverPort}`);
  return serverPort;
}

// Create native desktop window
function createMainWindow(port) {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'My AI Mentor',
    icon: iconPath,
    backgroundColor: '#030712', // Matches dark mode zinc-950
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Native application menu
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Data Directory',
          click: () => shell.openPath(userDataPath),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About My AI Mentor',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About My AI Mentor',
              message: 'My AI Mentor — Desktop Edition',
              detail: `Personal AI Study Mentor, Timetable & Productivity System\n\nVersion: ${app.getVersion()}\nData Location: ${userDataPath}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nChrome: ${process.versions.chrome}`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load local URL
  const appUrl = `http://127.0.0.1:${port}`;
  mainWindow.loadURL(appUrl);

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`) && !url.startsWith(`http://localhost:${port}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance focus handler
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    const port = await startLocalServer();
    createMainWindow(port);
  } catch (err) {
    console.error('[Desktop] Failed to initialize application:', err);
    dialog.showErrorBox(
      'My AI Mentor — Startup Error',
      `Failed to initialize local server:\n${err.message || err}\n\nPlease verify that the application files are intact.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort) {
      createMainWindow(serverPort);
    }
  });
});

// Clean server shutdown
app.on('before-quit', (e) => {
  if (serverInstance) {
    console.log('[Desktop] Shutting down local server...');
    try {
      serverInstance.close();
      serverInstance = null;
    } catch (err) {
      console.error('[Desktop] Error closing server:', err);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-user-data-path', () => userDataPath);
ipcMain.handle('open-data-folder', () => shell.openPath(userDataPath));
ipcMain.handle('open-external', (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});
