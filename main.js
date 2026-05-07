const electron = require('electron')
const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, nativeImage } = electron
const path = require('path')
const db = require('./database/db')

let mainWindow = null
let tray = null
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 320,
    minHeight: 480,
    frame: false,
    resizable: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 NabNote',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  tray.setToolTip('NabNote')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function setupIpc() {
  ipcMain.handle('notes:getAll', () => db.getAll())
  ipcMain.handle('notes:search', (_e, { keyword }) => db.search(keyword))
  ipcMain.handle('notes:add', (_e, { content }) => db.add(content))
  ipcMain.handle('notes:toggleDone', (_e, { id }) => db.toggleDone(id))
  ipcMain.handle('notes:update', (_e, { id, content }) => db.updateNote(id, content))
  ipcMain.handle('notes:togglePinned', (_e, { id }) => db.toggleNotePinned(id))
  ipcMain.handle('notes:delete', (_e, { id }) => db.deleteNote(id))

  ipcMain.handle('folders:getByParent', (_e, { parentId }) => db.getFoldersByParent(parentId))
  ipcMain.handle('folders:create', (_e, { name, parentId }) => db.createFolder(name, parentId))
  ipcMain.handle('folders:rename', (_e, { id, name }) => db.renameFolder(id, name))
  ipcMain.handle('folders:delete', (_e, { id }) => db.deleteFolder(id))
  ipcMain.handle('folders:getPath', (_e, { id }) => db.getFolderPath(id))

  ipcMain.handle('ideas:getByFolder', (_e, { folderId }) => db.getIdeasByFolder(folderId))
  ipcMain.handle('ideas:create', (_e, { content, folderId, images }) => db.createIdea(content, folderId, images))
  ipcMain.handle('ideas:update', (_e, { id, content, images }) => db.updateIdea(id, content, images))
  ipcMain.handle('ideas:togglePinned', (_e, { id }) => db.toggleIdeaPinned(id))
  ipcMain.handle('ideas:delete', (_e, { id }) => db.deleteIdea(id))
  ipcMain.handle('ideas:search', (_e, { keyword, folderId }) => db.searchIdeas(keyword, folderId))

  ipcMain.handle('images:save', (_e, { dataUrl }) => db.saveImage(dataUrl))
  ipcMain.handle('images:delete', (_e, { filename }) => db.deleteImage(filename))
  ipcMain.handle('images:getPath', (_e, { filename }) => db.getImagePath(filename))

  ipcMain.handle('config:get', (_e, { key }) => ({ value: db.getConfig(key) }))
  ipcMain.handle('config:set', (_e, { key, value }) => db.setConfig(key, value))

  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:close', () => mainWindow.close())
}

app.whenReady().then(async () => {
  await db.init(app)
  createWindow()
  createTray()
  registerShortcuts()
  setupIpc()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow.show()
    }
  })
}).catch(err => {
  console.error('App startup error:', err)
})

app.on('window-all-closed', () => {
})

app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
  db.close()
})
