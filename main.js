const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } = require('electron')
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
  tray = new Tray(iconPath)
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
  ipcMain.handle('notes:getAll', () => {
    return db.getAll()
  })

  ipcMain.handle('notes:search', (_event, { keyword }) => {
    return db.search(keyword)
  })

  ipcMain.handle('notes:add', (_event, { content }) => {
    return db.add(content)
  })

  ipcMain.handle('notes:toggleDone', (_event, { id }) => {
    return db.toggleDone(id)
  })

  ipcMain.handle('notes:delete', (_event, { id }) => {
    return db.deleteNote(id)
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window:close', () => {
    mainWindow.close()
  })
}

app.whenReady().then(async () => {
  await db.init()
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
})

app.on('window-all-closed', () => {
})

app.on('before-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
  db.close()
})
