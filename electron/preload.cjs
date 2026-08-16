const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  version: process.versions.electron,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: (callback) => {
    const listener = (_event, update) => callback(update)
    ipcRenderer.on('update-status', listener)
    return () => ipcRenderer.removeListener('update-status', listener)
  },
})
