const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('ampcastElectron', {
    quit: () => ipcRenderer.send('quit'),
    disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),
    enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
    getCredential: (key) => ipcRenderer.invoke('getCredential', key),
    setCredential: (key, value) => ipcRenderer.invoke('setCredential', key, value),
    clearCredentials: () => ipcRenderer.invoke('clearCredentials'),
    setFontSize: (fontSize) => ipcRenderer.send('setFontSize', fontSize),
    setFrameColor: (color) => ipcRenderer.send('setFrameColor', color),
    setFrameTextColor: (color) => ipcRenderer.send('setFrameTextColor', color),
    getLocalhostIP: () => ipcRenderer.invoke('getLocalhostIP'),
    getPreferredPort: () => ipcRenderer.invoke('getPreferredPort'),
    setPreferredPort: (port) => ipcRenderer.invoke('setPreferredPort', port),
    exportPlaylist: (request, onProgress) => {
        const listener = (_, progress) => {
            if (progress.operationId === request.operationId) {
                onProgress(progress);
            }
        };
        ipcRenderer.on('export-playlist-progress', listener);
        return ipcRenderer
            .invoke('export-playlist', request)
            .finally(() => ipcRenderer.removeListener('export-playlist-progress', listener));
    },
    cancelPlaylistExport: (operationId) =>
        ipcRenderer.send('cancel-playlist-export', operationId),
    clearPlaylistExportBatch: (batchId) =>
        ipcRenderer.send('clear-playlist-export-batch', batchId),
    getRemovableExportTargets: () => ipcRenderer.invoke('get-removable-export-targets'),
});
