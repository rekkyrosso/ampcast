const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('ampcastElectron', {
    quit: () => ipcRenderer.invoke('quit'),
    setFontSize: (fontSize) => ipcRenderer.invoke('setFontSize', fontSize),
    setFrameColor: (color) => ipcRenderer.invoke('setFrameColor', color),
    setFrameTextColor: (color) => ipcRenderer.invoke('setFrameTextColor', color),
    setPort: (port) => ipcRenderer.invoke('setPort', port),
    setTheme: (theme) => ipcRenderer.invoke('setTheme', theme),
});
