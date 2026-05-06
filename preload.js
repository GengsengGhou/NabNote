const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nabnote', {
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  searchNotes: (keyword) => ipcRenderer.invoke('notes:search', { keyword }),
  addNote: (content) => ipcRenderer.invoke('notes:add', { content }),
  toggleDone: (id) => ipcRenderer.invoke('notes:toggleDone', { id }),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', { id }),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
})
