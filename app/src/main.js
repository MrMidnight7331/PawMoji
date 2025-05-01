const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('./database');

let userDir, dbPath, settingsPath, mainWin, editorWin, tray;

async function chooseDataDir() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select PawMoji Data Folder',
        properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) app.quit();
    return filePaths[0];
}

async function initPaths() {
    const defaultDir = path.join(app.getPath('documents'), 'PawMoji');
    userDir = fs.existsSync(defaultDir) ? defaultDir : await chooseDataDir();
    dbPath = path.join(userDir, 'kaomoji.db');
    settingsPath = path.join(userDir, 'settings.json');
    fs.mkdirSync(userDir, { recursive: true });
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark', hotkey: 'Ctrl+Shift+P', discordMode: false }, null, 2));
    }
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, new Uint8Array());
}

function loadSettings() {
    try {
        const s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        return { theme: 'dark', hotkey: 'Ctrl+Shift+P', discordMode: false, ...s };
    } catch {
        const def = { theme: 'dark', hotkey: 'Ctrl+Shift+P', discordMode: false };
        fs.writeFileSync(settingsPath, JSON.stringify(def, null, 2));
        return def;
    }
}

function saveSettings(partial) {
    const current = loadSettings();
    const merged = { ...current, ...partial };
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
}

function createMenu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        { role: 'fileMenu' }, { role: 'editMenu' }, { role: 'viewMenu' },
        { role: 'windowMenu' }, { role: 'help' },
        {
            label: 'Settings', submenu: [
                { label: 'Database Editor', click: () => openEditor() },
                { type: 'separator' },
                { label: 'Open Config', click: () => shell.openPath(settingsPath) },
                { type: 'separator' },
                {
                    label: 'Discord Escape',
                    type: 'checkbox',
                    checked: loadSettings().discordMode,
                    click: (menuItem) => {
                        saveSettings({ discordMode: menuItem.checked });
                        // Optional: notify renderers that settings changed:
                        if (mainWin) mainWin.webContents.send('db-updated');
                    }
                }
            ]
        }
    ]));
}

async function createMain() {
    const { theme, hotkey } = loadSettings();
    // Window setup
    mainWin = new BrowserWindow({ width: 350, height: 700, show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    await mainWin.loadFile(path.join(__dirname, 'index.html'));
    mainWin.webContents.send('initial-theme', theme);
    mainWin.show();

    // Init DB after show
    Database.init(dbPath).then(() => Database.save(dbPath));

    mainWin.on('close', e => { if (!app.isQuitting) { e.preventDefault(); mainWin.hide(); } });

    // Tray
    const iconPath = path.join(__dirname, ''); // add a ~16×16 or 24×24 image here
    if (fs.existsSync(iconPath)) {
        tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
        tray.setToolTip('PawMoji');
        tray.on('click', () => {
            if (mainWin.isVisible()) mainWin.hide();
            else mainWin.show();
        });
        tray.setContextMenu(Menu.buildFromTemplate([
            { label: 'Show/Hide PawMoji', click: () => mainWin.isVisible() ? mainWin.hide() : mainWin.show() },
            { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
        ]));
    }

    // Hotkey
    try {
        globalShortcut.unregisterAll();
        globalShortcut.register(hotkey, () => {
            if (!mainWin) return;
            // Toggle visibility of the *same* window
            mainWin.isVisible() ? mainWin.hide() : mainWin.show();
        });
    } catch (err) {
        dialog.showErrorBox('Hotkey Error', `Failed to register: ${hotkey}\n${err.message}`);
    }

    // IPC
    ipcMain.on('resize-window', (_e, size) => mainWin.setContentSize(Math.min(size.width, 400), Math.max(200, Math.min(size.height, 800))));
    ipcMain.on('resize-editor', (_e, { desired, min }) => {
        if (!editorWin) return;
        const [w, h] = editorWin.getContentSize();
        const clamped = Math.max(min, Math.min(desired, 800));
        editorWin.setContentSize(w, Math.max(h, clamped));
    });
    ipcMain.on('request-theme', e => e.sender.send('initial-theme', loadSettings().theme));
}

function openEditor() {
    if (editorWin) return editorWin.focus();
    editorWin = new BrowserWindow({ width: 600, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    editorWin.loadFile(path.join(__dirname, 'db-editor.html'));
    editorWin.on('closed', () => { editorWin = null; mainWin.webContents.send('db-updated'); });
}

app.whenReady().then(async () => {
    await initPaths();
    createMenu();
    createMain();

    await Database.init(dbPath);
    Database.save(dbPath);

    ipcMain.handle('get-settings', () => loadSettings());
    ipcMain.handle('get-tags',     () => Database.getTags());
    ipcMain.handle('get-kaomojis', (_, tag) => Database.fetch(tag));
    ipcMain.handle('add-kaomoji',  (_, d) => { const id = Database.add(d.text, d.tags); Database.save(dbPath); return id; });
    ipcMain.handle('update-kaomoji',(_, d) => { Database.update(d.id, d.text, d.tags); Database.save(dbPath); return true; });
    ipcMain.handle('delete-kaomoji',(_, id) => { Database.remove(id); Database.save(dbPath); return true; });

});

app.on('before-quit', () => app.isQuitting = true);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

ipcMain.on('set-theme', (_e, theme) => saveSettings({ theme }));


