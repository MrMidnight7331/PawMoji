// src/renderer.js
const { ipcRenderer, clipboard } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');

    // Theme
    ipcRenderer.on('initial-theme', (_e, theme) => {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        toggle.checked = (theme === 'dark');
    });
    toggle.addEventListener('change', () => {
        const dark = toggle.checked;
        document.body.classList.toggle('dark-theme', dark);
        ipcRenderer.send('set-theme', dark ? 'dark' : 'light');
    });

    // Filters
    document.getElementById('filter-buttons')
        .addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') loadList(e.target.dataset.tag);
        });
    document.getElementById('reset-filter')
        .addEventListener('click', () => loadList());
    ipcRenderer.on('db-updated', () => {
        loadTags();
        loadList();
    });

    loadTags();
    loadList();
});

async function loadTags() {
    const tags = await ipcRenderer.invoke('get-tags');
    const container = document.getElementById('filter-buttons');
    container.innerHTML = '';
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.textContent = tag;
        btn.dataset.tag = tag;
        container.appendChild(btn);
    });
}

async function loadList(filter = '') {
    const items = await ipcRenderer.invoke('get-kaomojis', filter);
    const settings = await ipcRenderer.invoke('get-settings');
    const list = document.getElementById('kaomoji-list');
    list.innerHTML = '';

    items.forEach(k => {
        const div = document.createElement('div');
        div.classList.add('kaomoji-item');
        div.textContent = k.text;
        div.addEventListener('click', () => {
            const out = settings.discordMode ? "\\" + k.text : k.text;
            clipboard.writeText(out);
            showToast('Copied!');
        });
        list.appendChild(div);
    });

    adjustWindow();
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 1600);
}

function adjustWindow() {
    const header = document.getElementById('header');
    const list   = document.getElementById('kaomoji-list');
    const neededHeight = header.offsetHeight + list.scrollHeight + 32;
    ipcRenderer.send('resize-window', {
        width: 400,
        height: Math.max(neededHeight, 200)
    });
}