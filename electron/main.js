import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import updater from 'electron-updater'

const { autoUpdater } = updater

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let mainWindow
let manualUpdateCheck = false
let updateCheckInProgress = false

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function sendUpdateStatus(status, message, progress = null) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, message, progress })
  }
}

async function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    const message = 'Update checks are available in the installed app.'
    sendUpdateStatus('development', message)
    if (manual) await dialog.showMessageBox({ type: 'info', message })
    return
  }

  if (updateCheckInProgress) {
    sendUpdateStatus('checking', 'An update check is already running.')
    return
  }

  manualUpdateCheck = manual
  updateCheckInProgress = true
  sendUpdateStatus('checking', 'Checking for updates...')

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    updateCheckInProgress = false
    const message = `Unable to check for updates: ${error.message}`
    sendUpdateStatus('error', message)
    if (manual) await dialog.showMessageBox({ type: 'error', message })
  }
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates(true),
        },
        { type: 'separator' },
        {
          label: `About IECES Admin Dashboard v${app.getVersion()}`,
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: 'About IECES Admin Dashboard',
              message: `IECES Admin Dashboard v${app.getVersion()}`,
            }),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus(
    'available',
    `Version ${info.version} is available and is being downloaded.`,
  )
})

autoUpdater.on('update-not-available', async () => {
  updateCheckInProgress = false
  const message = `You're running the latest version (${app.getVersion()}).`
  sendUpdateStatus('not-available', message)
  if (manualUpdateCheck) await dialog.showMessageBox({ type: 'info', message })
  manualUpdateCheck = false
})

autoUpdater.on('download-progress', ({ percent }) => {
  const progress = Math.max(0, Math.min(100, Math.round(percent)))
  sendUpdateStatus('downloading', `Downloading update: ${progress}%`, progress)
})

autoUpdater.on('update-downloaded', async (info) => {
  updateCheckInProgress = false
  manualUpdateCheck = false
  sendUpdateStatus('downloaded', `Version ${info.version} is ready to install.`)
  const { response } = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Restart and Install', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Update Ready',
    message: `IECES Admin Dashboard v${info.version} has been downloaded.`,
    detail: 'Restart the application now to finish installing the update.',
  })

  if (response === 0) autoUpdater.quitAndInstall()
})

autoUpdater.on('error', (error) => {
  updateCheckInProgress = false
  sendUpdateStatus('error', `Updater error: ${error.message}`)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

ipcMain.handle('check-for-updates', () => checkForUpdates(true))

app.whenReady().then(() => {
  createApplicationMenu()
  createWindow()

  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(false), 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
