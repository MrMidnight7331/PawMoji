// src/main.js
const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const Database = require('./database');

let userDir, dbPath, settingsPath;
let mainWin, editorWin, tray;

async function chooseDataDir() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select folder for PawMoji data',
        buttonLabel: 'Select',
        properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) app.exit();
    return filePaths[0];
}

async function initPaths() {
    const home = app.getPath('home');
    const defaultDir = path.join(home, 'Documents', 'PawMoji');

    const defaultDb      = path.join(defaultDir, 'kaomoji.db');
    const defaultSetting = path.join(defaultDir, 'settings.json');
    const missing = !fs.existsSync(defaultDb) || !fs.existsSync(defaultSetting);

    userDir      = missing ? await chooseDataDir() : defaultDir;
    dbPath       = path.join(userDir, 'kaomoji.db');
    settingsPath = path.join(userDir, 'settings.json');

    // now safe to create
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    if (!fs.existsSync(settingsPath) || fs.statSync(settingsPath).size < 5) {
        fs.writeFileSync(settingsPath, JSON.stringify({
            theme: 'dark',
            hotkey: 'CommandOrControl+Shift+P'
        }, null, 2));
    }
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, new Uint8Array());
    }
}

function loadSettings() {
    try {
        const raw = fs.readFileSync(settingsPath, 'utf-8').trim();
        if (!raw) throw new Error('empty');
        return JSON.parse(raw);
    } catch (err) {
        dialog.showErrorBox('Settings Error', `Invalid settings.json; reset to defaults.\n${err.message}`);
        const def = { theme: 'dark', hotkey: 'CommandOrControl+Shift+P' };
        fs.writeFileSync(settingsPath, JSON.stringify(def, null, 2));
        return def;
    }
}

function saveSettings(partial) {
    const current = loadSettings();
    const merged  = { ...current, ...partial };
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
}

function createMenu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        { role: 'fileMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
        { role: 'help' },
        {
            label: 'Settings',
            submenu: [
                { label: 'KaomojiDB',    click: () => openEditor() },
                { type: 'separator' },
                { label: 'App Settings', click: () => shell.openPath(settingsPath) }
            ]
        }
    ]));
}

async function createMain() {
    const { theme, hotkey } = loadSettings();

    await Database.init(dbPath);
    Database.ensureSchema();
    Database.save(dbPath);

    mainWin = new BrowserWindow({
        width: 350,
        height: 700,
        resizable: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    await mainWin.loadFile(path.join(__dirname, 'index.html'));
    mainWin.webContents.send('initial-theme', theme);
    mainWin.show();

    mainWin.on('close', e => {
        if (!app.isQuitting) { e.preventDefault(); mainWin.hide(); }
    });

    const iconPath = path.join(__dirname, 'tray-icon.png');
    if (fs.existsSync(iconPath)) {
        tray = new Tray(nativeImage.createFromPath(iconPath));
        tray.setToolTip('PawMoji is running');
        tray.on('click', () => mainWin.show());
        tray.setContextMenu(Menu.buildFromTemplate([
            { label: 'Show PawMoji', click: () => mainWin.show() },
            { label: 'Quit',          click: () => { app.isQuitting = true; app.quit(); } }
        ]));
    }

    globalShortcut.unregisterAll();
    if (!globalShortcut.register(hotkey, () => {
        mainWin.isVisible() ? mainWin.hide() : mainWin.show();
    })) {
        dialog.showErrorBox('Hotkey Error', `Failed to register: ${hotkey}`);
    }

    ipcMain.on('resize-window', (_e, { width, height }) => {
        if (!mainWin) return;

        const maxH = 800;
        const minH = 200;

        // clamp height
        const newH = Math.min(Math.max(height, minH), maxH);

        // clamp width
        const newW = Math.min(width, 400);

        mainWin.setContentSize(newW, newH);
    });


    // main.js
    ipcMain.on('resize-editor', (_e, { desired, min }) => {
        if (!editorWin) return;
        const [w, currentH] = editorWin.getContentSize();
        const maxH = 800;
        // clamp desired between min and max, then ensure it’s at least the current height
        const clamped = Math.max(min, Math.min(desired, maxH));
        const newH = Math.max(currentH, clamped);
        editorWin.setContentSize(w, newH);
    });


    // after creating mainWin…
    ipcMain.on('request-theme', event => {
        const { theme } = loadSettings();
        event.sender.send('initial-theme', theme);
    });

}

function openEditor() {
    if (editorWin) return editorWin.focus();
    editorWin = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    editorWin.loadFile(path.join(__dirname, 'db-editor.html'));
    editorWin.on('closed', () => {
        editorWin = null;
        if (mainWin) mainWin.webContents.send('db-updated');
    });
}

app.whenReady().then(async () => {
    await initPaths();
    createMenu();
    createMain();
});

app.on('before-quit', () => app.isQuitting = true);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// persist theme toggle from renderer
ipcMain.on('set-theme', (_e, theme) => saveSettings({ theme }));

// data handlers...
ipcMain.handle('get-tags',     () => Database.getTags());
ipcMain.handle('get-kaomojis', (_, tag) => Database.fetch(tag));
ipcMain.handle('add-kaomoji',  (_, { text, tags }) => {
    const id = Database.add(text, tags);
    Database.save(dbPath);
    return id;
});
ipcMain.handle('update-kaomoji',(_, { id, text, tags }) => {
    Database.update(id, text, tags);
    Database.save(dbPath);
    return true;
});
ipcMain.handle('delete-kaomoji',(_, id) => {
    Database.remove(id);
    Database.save(dbPath);
    return true;
});
