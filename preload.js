const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nabnote', {
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  searchNotes: (keyword) => ipcRenderer.invoke('notes:search', { keyword }),
  addNote: (content) => ipcRenderer.invoke('notes:add', { content }),
  toggleDone: (id) => ipcRenderer.invoke('notes:toggleDone', { id }),
  updateNote: (id, content) => ipcRenderer.invoke('notes:update', { id, content }),
  toggleNotePinned: (id) => ipcRenderer.invoke('notes:togglePinned', { id }),
  deleteNote: (id) => ipcRenderer.invoke('notes:delete', { id }),

  getFoldersByParent: (parentId) => ipcRenderer.invoke('folders:getByParent', { parentId }),
  createFolder: (name, parentId) => ipcRenderer.invoke('folders:create', { name, parentId }),
  renameFolder: (id, name) => ipcRenderer.invoke('folders:rename', { id, name }),
  deleteFolder: (id) => ipcRenderer.invoke('folders:delete', { id }),
  getFolderPath: (id) => ipcRenderer.invoke('folders:getPath', { id }),

  getIdeasByFolder: (folderId) => ipcRenderer.invoke('ideas:getByFolder', { folderId }),
  createIdea: (content, folderId, images) => ipcRenderer.invoke('ideas:create', { content, folderId, images }),
  updateIdea: (id, content, images) => ipcRenderer.invoke('ideas:update', { id, content, images }),
  toggleIdeaPinned: (id) => ipcRenderer.invoke('ideas:togglePinned', { id }),
  deleteIdea: (id) => ipcRenderer.invoke('ideas:delete', { id }),
  searchIdeas: (keyword, folderId) => ipcRenderer.invoke('ideas:search', { keyword, folderId }),

  saveImage: (dataUrl) => ipcRenderer.invoke('images:save', { dataUrl }),
  deleteImage: (filename) => ipcRenderer.invoke('images:delete', { filename }),
  getImagePath: (filename) => ipcRenderer.invoke('images:getPath', { filename }),

  getConfig: (key) => ipcRenderer.invoke('config:get', { key }),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', { key, value }),

  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
})
