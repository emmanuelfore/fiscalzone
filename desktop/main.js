const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: "POS Desktop Terminal",
    icon: path.join(__dirname, 'icon.png'), // Placeholder if icon exists
    show: false // We will show it and maximize it to prevent flickering
  });

  mainWindow.maximize();
  mainWindow.show();

  // IPC handler for native printing
  ipcMain.handle('print-receipt', async (event, html, printerName) => {
    return new Promise((resolve, reject) => {
      // Create a hidden window to render the HTML for printing
      let printWindow = new BrowserWindow({ 
        show: false,
        webPreferences: { nodeIntegration: false }
      });
      
      const content = `
        <!DOCTYPE html>
        <html>
          <head><style>body { margin: 0; padding: 0; }</style></head>
          <body>${html}</body>
        </html>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`);

      printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined // Will use default if undefined
        }, (success, errorType) => {
          if (!success) {
            reject(new Error(`Printing failed: ${errorType}`));
          } else {
            resolve(true);
          }
          printWindow.close();
          printWindow = null;
        });
      });
    });
  });

  // For production, this should be the deployed web application URL.
  // We check if the app is packaged to determine the environment.
  const isDev = !app.isPackaged;
  const prodUrl = 'https://fisczim-production-url.com/pos-login'; // TODO: Replace with actual deployed URL
  const devUrl = 'http://localhost:5001/pos-login';
  
  const startUrl = process.env.ELECTRON_START_URL || (isDev ? devUrl : prodUrl);
  
  mainWindow.loadURL(startUrl);

  // Optional: Hide menu bar for a cleaner kiosk-like experience
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', function () {
    app.quit();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
