const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, 'assets/icon.png'), // Path to your icon
    skipTaskbar: false, // Show in taskbar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: getIconPath()
  });

  mainWindow.loadFile('index.html');

  // Window close handler
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault(); // Prevent actual closing
      mainWindow.hide(); // Just hide the window

      // Show notification (optional)
      if (tray && !tray.isDestroyed()) {
        tray.displayBalloon({
          title: 'Promptix AI',
          content: 'The app is still running in the background'
        });
      }
    }
  });

  // Recreate window if dock icon is clicked (macOS)
  mainWindow.on('show', () => {
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  });

  createTray();
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;

  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow.isDestroyed()) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Promptix AI');
  tray.setContextMenu(contextMenu);

  // Windows/Linux: Double click to show
  if (process.platform !== 'darwin') {
    tray.on('double-click', () => mainWindow.show());
  }
}

app.whenReady().then(createWindow);

// macOS: Recreate window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.on('window-hide', () => mainWindow.hide());
ipcMain.on('window-close', () => {
  isQuitting = true;
  app.quit();
});

// Helper function
function getIconPath() {
  const paths = [
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, 'icon.png'),
    path.join(process.resourcesPath, 'icon.png')
  ];

  for (const p of paths) {
    try {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return p;
    } catch (e) { continue; }
  }
  return undefined;
}