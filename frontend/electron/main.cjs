// Electron main process. This only wraps the existing frontend in a native
// window — it does not run or bundle the backend. Xenovaa Chat is a
// multi-user real-time app (Socket.IO presence + live messaging live in the
// backend process's memory), so every desktop client must talk to the same
// centrally-running backend over the network, exactly like the web version
// does via VITE_API_URL / VITE_SOCKET_URL. Bundling a separate backend into
// each desktop install would isolate users from each other and silently
// break real-time chat.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.ELECTRON_DEV_SERVER_URL || 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open any target="_blank" links (e.g. uploaded files/images) in the
  // system browser instead of a bare Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
