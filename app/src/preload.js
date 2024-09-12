const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('ampcastElectron', {
    quit: () => ipcRenderer.send('quit'),
    getCredential: (key) => ipcRenderer.invoke('getCredential', key),
    setCredential: (key, value) => ipcRenderer.invoke('setCredential', key, value),
    clearCredentials: () => ipcRenderer.invoke('clearCredentials'),
    setFontSize: (fontSize) => ipcRenderer.send('setFontSize', fontSize),
    setFrameColor: (color) => ipcRenderer.send('setFrameColor', color),
    setFrameTextColor: (color) => ipcRenderer.send('setFrameTextColor', color),
    getPreferredPort: () => ipcRenderer.invoke('getPreferredPort'),
    setPreferredPort: (port) => ipcRenderer.invoke('setPreferredPort', port),
});
