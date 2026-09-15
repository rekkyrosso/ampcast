import {
    app,
    components,
    desktopCapturer,
    dialog,
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
import path from 'node:path';
import {execFile} from 'node:child_process';
import {Worker} from 'node:worker_threads';
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
const playlistExports = new Map();
const playlistExportDestinations = new Map();

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

    // System audio.
    ipcMain.handle('enable-loopback-audio', () => {
        mainWindow?.webContents.session.setDisplayMediaRequestHandler(async (_, callback) => {
            if (isMac()) {
                try {
                    const [source] = await desktopCapturer.getSources({
                        thumbnailSize: {height: 0, width: 0},
                        types: ['screen'],
                    });
                    callback(source ? {audio: 'loopback', video: source} : {});
                } catch (err) {
                    log.warn('Failed to capture system audio', err);
                    callback({});
                }
            } else {
                callback({audio: 'loopback'});
            }
        });
    });
    ipcMain.handle('disable-loopback-audio', () => {
        mainWindow?.webContents.session.setDisplayMediaRequestHandler(null);
    });

    ipcMain.on('cancel-playlist-export', (_, operationId) => {
        playlistExports.get(operationId)?.cancel();
    });
    ipcMain.on('clear-playlist-export-batch', (_, batchId) => {
        playlistExportDestinations.delete(batchId);
    });
    ipcMain.handle('get-removable-export-targets', getRemovableExportTargets);

    ipcMain.handle('export-playlist', async (event, request) => {
        const tracks = Array.isArray(request?.tracks) ? request.tracks : [];
        if (tracks.length === 0) {
            return {canceled: false, exported: 0, skipped: request?.skipped || 0, errors: []};
        }
        let canceled = false;
        const pendingExport = {cancel: () => (canceled = true)};
        playlistExports.set(request.operationId, pendingExport);

        let destination = playlistExportDestinations.get(request.batchId);
        if (!destination) {
            if (request.destination) {
                const targets = await getRemovableExportTargets();
                const requestedPath = path.resolve(request.destination);
                const target = targets.find(
                    ({path: targetPath}) => path.resolve(targetPath) === requestedPath
                );
                if (!target) {
                    playlistExports.delete(request.operationId);
                    throw Error('The selected removable drive is no longer available');
                }
                destination = target.path;
            } else {
                const selection = await dialog.showOpenDialog(mainWindow, {
                    title: 'Export playlist to MP3',
                    buttonLabel: 'Export here',
                    properties: ['openDirectory', 'createDirectory'],
                });
                if (
                    selection.canceled ||
                    !selection.filePaths[0] ||
                    canceled
                ) {
                    playlistExports.delete(request.operationId);
                    return {canceled: true, exported: 0, skipped: 0, errors: []};
                }
                destination = selection.filePaths[0];
            }
            playlistExportDestinations.set(request.batchId, destination);
        }

        try {
            if (canceled) {
                return {canceled: true, exported: 0, skipped: 0, errors: []};
            }
            return await runPlaylistExportWorker(event, request, destination, pendingExport);
        } finally {
            playlistExports.delete(request.operationId);
        }
    });
}

function runPlaylistExportWorker(event, request, destination, pendingExport) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./playlistExportWorker.js', import.meta.url), {
            workerData: {request, destination},
        });
        let settled = false;
        pendingExport.cancel = () => worker.postMessage({type: 'cancel'});

        worker.on('message', (message) => {
            if (message?.type === 'progress') {
                if (!event.sender.isDestroyed()) {
                    event.sender.send('export-playlist-progress', {
                        operationId: request.operationId,
                        ...message.progress,
                    });
                }
            } else if (message?.type === 'result') {
                settled = true;
                resolve(message.result);
            } else if (message?.type === 'error') {
                settled = true;
                reject(Error(message.error));
            }
        });
        worker.once('error', (err) => {
            if (!settled) {
                settled = true;
                reject(err);
            }
        });
        worker.once('exit', (code) => {
            if (!settled) {
                settled = true;
                reject(Error(`Playlist export worker stopped unexpectedly (${code})`));
            }
        });
    });
}

async function getRemovableExportTargets() {
    if (process.platform !== 'win32') return [];
    const script = [
        '$items = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=2" | ForEach-Object {',
        '  $letter = $_.DeviceID',
        '  [PSCustomObject]@{ path = "$letter\\"; label = if ($_.VolumeName) { "$($_.VolumeName) ($letter)" } else { "USB drive ($letter)" }; freeBytes = [double]$_.FreeSpace; totalBytes = [double]$_.Size }',
        '})',
        '$items | ConvertTo-Json -Compress',
    ].join('; ');
    const stdout = await new Promise((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', script],
            {
                encoding: 'utf8',
                windowsHide: true,
                maxBuffer: 1024 * 1024,
                timeout: 5000,
                killSignal: 'SIGKILL',
            },
            (err, output) => (err ? reject(err) : resolve(output))
        );
    });
    if (!String(stdout).trim()) return [];
    const parsed = JSON.parse(stdout);
    return (Array.isArray(parsed) ? parsed : [parsed]).filter(
        (target) => target?.path && target?.label
    );
}

function sendExportProgress(event, operationId, progress) {
    if (!event.sender.isDestroyed()) {
        event.sender.send('export-playlist-progress', {operationId, ...progress});
    }
}

function sanitizeFileName(value) {
    const sanitized = String(value)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/[. ]+$/g, '')
        .trim();
    return sanitized.slice(0, 180) || 'Untitled';
}

function createM3uEntry(track, fileName) {
    const displayName = `${track.artist ? `${track.artist} - ` : ''}${track.title || fileName}`;
    return [
        `#AMPCAST-ID:${encodeURIComponent(track.id || '')}`,
        `#EXTINF:${Math.round(track.duration || -1)},${displayName.replace(/[\r\n]/g, ' ')}`,
        fileName,
    ];
}

function getExportFileName(track, index, total) {
    const prefix = String(index + 1).padStart(String(total).length, '0');
    const baseName = sanitizeFileName(
        track.fileName || `${track.title || `Track ${index + 1}`}.mp3`
    );
    return `${prefix} - ${baseName}`;
}

async function isNonEmptyFile(filePath) {
    try {
        const stats = await fsPromises.stat(filePath);
        return stats.isFile() && stats.size > 0;
    } catch {
        return false;
    }
}

function createM3uFile(bitRate, entries) {
    return `${[
        '#EXTM3U',
        `#AMPCAST:BITRATE=${Number(bitRate)}`,
        '#AMPCAST:TAGS=1',
        ...entries,
    ].join('\r\n')}\r\n`;
}

async function readManagedPlaylist(playlistPath) {
    try {
        const contents = await fsPromises.readFile(playlistPath, 'utf8');
        const bitRate = Number(contents.match(/^#AMPCAST:BITRATE=(\d+)\r?$/m)?.[1]) || 0;
        const tagVersion = Number(contents.match(/^#AMPCAST:TAGS=(\d+)\r?$/m)?.[1]) || 0;
        const entries = [];
        let id;
        for (const rawLine of contents.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (line.startsWith('#AMPCAST-ID:')) {
                try {
                    id = decodeURIComponent(line.slice('#AMPCAST-ID:'.length));
                } catch {
                    id = undefined;
                }
            } else if (line && !line.startsWith('#') && path.basename(line) === line) {
                entries.push({id, fileName: line});
                id = undefined;
            }
        }
        const files = new Set(
            entries.map(({fileName}) => fileName)
        );
        return {bitRate, tagVersion, files, entries};
    } catch {
        return {bitRate: 0, tagVersion: 0, files: new Set(), entries: []};
    }
}

async function reconcileExportedTrackNames(oldPlaylist, tracks, exportDirectory) {
    const unused = new Set(oldPlaylist.entries);
    const assignments = [];
    for (let index = 0; index < tracks.length; index++) {
        const track = tracks[index];
        const desiredName = getExportFileName(track, index, tracks.length);
        const desiredBase = stripTrackPosition(desiredName);
        let entry = [...unused].find(({id}) => id && id === track.id);
        entry ||= [...unused].find(
            ({fileName}) => stripTrackPosition(fileName).toLowerCase() === desiredBase.toLowerCase()
        );
        if (!entry) continue;
        const sourcePath = path.join(exportDirectory, entry.fileName);
        if (!(await isNonEmptyFile(sourcePath))) continue;
        unused.delete(entry);
        if (entry.fileName !== desiredName) {
            assignments.push({sourcePath, destinationPath: path.join(exportDirectory, desiredName)});
        }
    }

    const staged = [];
    for (const assignment of assignments) {
        const temporaryPath = `${assignment.sourcePath}.reorder-${crypto.randomUUID()}`;
        await fsPromises.rename(assignment.sourcePath, temporaryPath);
        staged.push({...assignment, temporaryPath});
    }
    for (const {temporaryPath, destinationPath} of staged) {
        await fsPromises.rm(destinationPath, {force: true});
        await fsPromises.rename(temporaryPath, destinationPath);
    }
}

function stripTrackPosition(fileName) {
    return fileName.replace(/^\d+ - /, '');
}

async function writeCarCompatibleTags(track, filePath, artworkCache, signal) {
    const tags = {
        title: String(track.title || ''),
        artist: String(track.artist || track.albumArtist || ''),
        performerInfo: String(track.albumArtist || track.artist || ''),
        album: String(track.album || ''),
        trackNumber: track.track ? String(track.track) : undefined,
        partOfSet: track.disc ? String(track.disc) : undefined,
        year: track.year ? String(track.year) : undefined,
    };
    if (track.artworkUrl) {
        let imageBuffer;
        try {
            imageBuffer = await getArtwork(track.artworkUrl, artworkCache, signal);
        } catch (err) {
            if (signal.aborted) throw err;
            log.warn(`Could not embed artwork for ${track.title || 'track'}:`, err);
        }
        if (imageBuffer) {
            tags.image = {
                mime: 'image/jpeg',
                type: {id: 3, name: 'front cover'},
                description: 'Cover',
                imageBuffer,
            };
        }
    }
    const result = NodeID3.update(tags, filePath);
    if (result instanceof Error) {
        throw result;
    }
}

async function getArtwork(url, cache, signal) {
    if (!cache.has(url)) {
        cache.set(
            url,
            (async () => {
                const response = await fetch(url, {redirect: 'follow', signal});
                if (!response.ok) {
                    throw Error(`Artwork HTTP ${response.status}`);
                }
                const declaredSize = Number(response.headers.get('content-length')) || 0;
                if (declaredSize > 5 * 1024 * 1024) {
                    throw Error('Artwork is larger than 5 MB');
                }
                const buffer = Buffer.from(await response.arrayBuffer());
                if (buffer.length > 5 * 1024 * 1024) {
                    throw Error('Artwork is larger than 5 MB');
                }
                return buffer;
            })()
        );
    }
    return cache.get(url);
}

async function replaceTextFile(filePath, contents) {
    const partialPath = `${filePath}.part`;
    await fsPromises.writeFile(partialPath, contents, 'utf8');
    await fsPromises.rm(filePath, {force: true});
    await fsPromises.rename(partialPath, filePath);
}

async function checkForUpdatesAndNotify() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    try {
        await autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
        log.error(err);
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
    if (!isMac()) {
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

function isMac() {
    return process.platform === 'darwin';
}
