const {app, components, ipcMain, shell, BrowserWindow, Menu, nativeImage} = require('electron');
const {autoUpdater} = require('electron-updater');
const contextMenu = require('electron-context-menu');
const unhandled = require('electron-unhandled');
const windowStateKeeper = require('electron-window-state');
const path = require('path');
const server = require('./server');
const store = require('./store');
const menu = require('./menu');

unhandled();

module.exports = class AppUpdater {
    constructor() {
        const log = require('electron-log');
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
};

if (!app.requestSingleInstanceLock()) {
    // Prevent multiple instances of the app
    app.quit();
}

if (!app.isPackaged) {
    // https://github.com/electron/electron/issues/38790
    app.commandLine.appendSwitch('disable-features', 'WidgetLayering');
}

contextMenu({
    showSaveImageAs: true,
    showSelectAll: false,
});

const loginUrls = [
    'https://authorize.music.apple.com/',
    'https://accounts.spotify.com/authorize',
    'https://accounts.google.com/',
    'https://app.plex.tv/auth',
    'https://www.last.fm/api/auth',
];

let mainWindow;

function createSplashScreen() {
    const splash = new BrowserWindow({
        width: 512,
        height: 512,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
    });
    splash.loadFile(path.join(__dirname, 'splash.html'));
    splash.center();
    splash.show();
    return splash;
}

function createMainWindow(url) {
    const image = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    image.setTemplateImage(true);

    const mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 768,
    });
    const {x, y, width, height} = mainWindowState;

    mainWindow = new BrowserWindow({
        show: false,
        x,
        y,
        width,
        height,
        minWidth: 800,
        minHeight: 600,
        icon: image,
        backgroundColor: '#32312f',
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: 'rgba(0,0,0,0)',
            symbolColor: 'white',
            height: 24,
        },
        webPreferences: {
            devTools: !app.isPackaged,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Open links in the default browser.
    mainWindow.webContents.setWindowOpenHandler(({url}) => {
        // Ignore links from login buttons.
        if (loginUrls.some((loginUrl) => url.startsWith(loginUrl))) {
            return {action: 'allow'};
        }
        shell.openExternal(url);
        return {action: 'deny'};
    });

    mainWindowState.manage(mainWindow);

    mainWindow.loadURL(url);
}

function createBridge() {
    ipcMain.handle('quit', () => app.quit());

    // Synch the window chrome with the app theme.
    ipcMain.handle('setFrameColor', (_, color) => {
        mainWindow.setTitleBarOverlay({color});
    });
    ipcMain.handle('setFrameTextColor', (_, symbolColor) => {
        mainWindow.setTitleBarOverlay({symbolColor});
    });
    ipcMain.handle('setFontSize', (_, fontSize) => {
        const dragRegionRemSize = 1.5; // defined in web client CSS
        const height = Math.max(Math.round(fontSize * dragRegionRemSize), 24);
        mainWindow.setTitleBarOverlay({height});
    });
    ipcMain.handle('setTheme', () => {
        // ignore for now
    });

    // Switch port
    ipcMain.handle('setPort', async (_, newPort) => {
        parsedPort = parseInt(newPort, 10);
        if (parsedPort) {
            store.port = parsedPort; // possibly confirmation of change of port from the ui
            if (port !== parsedPort) {
                await server.stop();
                port = await server.start();
                url = `http://localhost:${port}/`;
                mainWindow.loadURL(url);
            }
        } else {
            console.error(TypeError(`Invalid port: '${newPort}'`));
        }
    });
}

app.whenReady().then(async () => {
    const splash = createSplashScreen();
    try {
        let [port] = await Promise.all([server.start(), components.whenReady()]);
        let url = `http://localhost:${port}/`;

        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
        createMainWindow(url);
        createBridge();

        // For mac apparently.
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                if (!mainWindow) {
                    createMainWindow(url);
                    mainWindow.show();
                }
            }
        });

        mainWindow.show();
        splash.close();
    } catch (err) {
        splash.destroy();
        throw err;
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
    }
});
