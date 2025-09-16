import {
    app,
    components,
    ipcMain,
    safeStorage,
    shell,
    BrowserWindow,
    Menu,
    nativeImage,
} from 'electron';
import electronUpdater from 'electron-updater';
import log from 'electron-log';
import contextMenu from 'electron-context-menu';
import unhandled from 'electron-unhandled';
import windowStateKeeper from 'electron-window-state';
import Store from 'electron-store';
import path from 'node:path';
import {__dirname} from './config.js';
import server from './server.js';
import store from './store.js';
import menu from './menu.js';

const {autoUpdater} = electronUpdater;

unhandled();

if (!app.requestSingleInstanceLock()) {
    // Prevent multiple instances of the app
    app.quit();
}

if (!app.isPackaged) {
    // https://github.com/electron/electron/issues/38790
    app.commandLine.appendSwitch('disable-features', 'WidgetLayering');
}

const loginUrls = [
    'https://authorize.music.apple.com/',
    'https://accounts.spotify.com/authorize',
    'https://accounts.google.com/',
    'https://app.plex.tv/auth',
    'https://www.last.fm/api/auth',
];

let mainWindow;

async function createSplashScreen(mainWindowState) {
    const {x, y, width, height} = mainWindowState;

    const splash = new BrowserWindow({
        x: x + Math.floor((width - 512) / 2),
        y: y + Math.floor((height - 512) / 2),
        width: 512,
        height: 512,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
    });
    await splash.loadFile(path.join(__dirname, 'splash.html'));
    if (mainWindowState.isMaximized) {
        splash.center();
    }
    splash.show();
    return splash;
}

async function createMainWindow(url, mainWindowState) {
    const image = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    image.setTemplateImage(true);

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
            devTools: true,
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

    await mainWindow.loadURL(url);
    mainWindow.show();
}

function createBridge() {
    ipcMain.on('quit', () => app.quit());

    // Synch the window chrome with the app theme.
    ipcMain.on('setFrameColor', (_, color) => {
        mainWindow?.setTitleBarOverlay?.({color});
    });
    ipcMain.on('setFrameTextColor', (_, symbolColor) => {
        mainWindow?.setTitleBarOverlay?.({symbolColor});
    });
    ipcMain.on('setFontSize', (_, fontSize) => {
        const dragRegionRemSize = 1.5; // defined in web client CSS
        const height = Math.max(Math.round(fontSize * dragRegionRemSize), 24);
        mainWindow?.setTitleBarOverlay?.({height});
    });

    // Server address.
    ipcMain.handle('getLocalhostIP', () => {
        return server.address;
    });

    // Preferred port.
    ipcMain.handle('getPreferredPort', () => {
        return store.port;
    });
    ipcMain.handle('setPreferredPort', async (_, newPort) => {
        const parsedPort = parseInt(newPort, 10);
        if (parsedPort) {
            store.port = parsedPort; // possibly confirmation of change of port from the ui
            if (server.port !== parsedPort) {
                await server.stop();
                const port = await server.start();
                const url = `http://localhost:${port}/`;
                mainWindow.loadURL(url);
            }
        } else {
            throw TypeError(`Invalid port: '${newPort}'`);
        }
    });

    // Credentials.
    const credentials = new Store({
        name: 'ampcast-credentials',
    });
    ipcMain.handle('getCredential', (_, key) => {
        const value = credentials.get(key);
        if (value) {
            const buffer = Buffer.from(value, 'latin1');
            return safeStorage.decryptString(buffer);
        }
        return '';
    });
    ipcMain.handle('setCredential', (_, key, value) => {
        const buffer = safeStorage.encryptString(value);
        credentials.set(key, buffer.toString('latin1'));
    });
    ipcMain.handle('clearCredentials', () => {
        credentials.clear();
    });
}

async function checkForUpdatesAndNotify() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    try {
        await autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
        console.error(err);
    }
}

app.whenReady().then(async () => {
    const mainWindowState = windowStateKeeper({
        defaultWidth: 1200,
        defaultHeight: 768,
    });
    const splash = await createSplashScreen(mainWindowState);
    try {
        let [port] = await Promise.all([server.start(), components.whenReady()]);
        let url = `http://localhost:${port}/`;

        contextMenu({showSaveImageAs: true, showSelectAll: false});
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
        createBridge();

        await createMainWindow(url, mainWindowState);
        splash.close();
        await checkForUpdatesAndNotify();

        // For mac apparently.
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                if (!mainWindow) {
                    await createMainWindow(url, mainWindowState);
                }
            }
        });
    } catch (err) {
        splash?.destroy();
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
