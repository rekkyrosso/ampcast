import {
    app,
    components,
    ipcMain,
    protocol,
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
import {initMain as initSystemAudio} from 'electron-audio-loopback';
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

initSystemAudio();

const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
appIcon.setTemplateImage(true);

const loginUrls = [
    'https://authorize.music.apple.com/',
    'https://accounts.spotify.com/authorize',
    'https://accounts.google.com/',
    'https://app.plex.tv/auth',
    'https://www.last.fm/api/auth',
    'https://oauth.ibroadcast.com/authorize',
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
    const {x, y, width, height} = mainWindowState;

    mainWindow = new BrowserWindow({
        show: false,
        x,
        y,
        width,
        height,
        minWidth: 800,
        minHeight: 600,
        icon: appIcon,
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
        if (url === `http://localhost:${server.port}/#mini-player`) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    backgroundColor: '#32312f',
                    titleBarStyle: 'hidden',
                    titleBarOverlay: {
                        color: 'rgba(0,0,0,0)',
                        symbolColor: 'white',
                        height: 24,
                    },
                    minimizable: false,
                    maximizable: false,
                    alwaysOnTop: true,
                    skipTaskbar: true,
                    webPreferences: {
                        preload: path.join(__dirname, 'preload.js'),
                    },
                },
            };
        } else if (loginUrls.some((loginUrl) => url.startsWith(loginUrl))) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    icon: appIcon,
                    minimizable: false,
                    autoHideMenuBar: true,
                    modal: true,
                },
            };
        } else {
            shell.openExternal(url);
            return {action: 'deny'};
        }
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

        protocol.handle('ampcast', (request) => {
            const pathname = request.url.slice('ampcast://'.length);
            if (pathname.startsWith('auth/spotify/callback/')) {
                return new Response('', {
                    status: 302,
                    headers: {Location: `${url}${pathname}`},
                });
            } else {
                return new Response('<h1>Not found</h1>', {
                    headers: {
                        status: 404,
                        'content-type': 'text/html',
                    },
                });
            }
        });

        contextMenu({showSaveImageAs: true, showSelectAll: false});
        Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
        createBridge();

        await createMainWindow(url, mainWindowState);
        splash.destroy();
        await checkForUpdatesAndNotify();

        // For macOS.
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
