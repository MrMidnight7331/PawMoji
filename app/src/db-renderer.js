// src/db-renderer.js
const { ipcRenderer } = require('electron');
const tbody = document.querySelector('#editor tbody');
const addBtn = document.getElementById('add-btn');

// theme
ipcRenderer.on('initial-theme', (_e, theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
});

// request theme & initial load
window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('request-theme');
    load();
});

// Levenshtein
function editDistance(a, b) { /* unchanged */ }

// autocorrect
async function correctTags(input) {
    const existing = await ipcRenderer.invoke('get-tags');
    return input
        .split(',')
        .map(raw => raw.trim())
        .filter(t => t)  // drop empties
        .map(tag => {
            let best = tag, minDist = Infinity;
            existing.forEach(e => {
                const dist = editDistance(tag.toLowerCase(), e.toLowerCase());
                if (dist < minDist) {
                    minDist = dist;
                    best = e;
                }
            });
            // only autocorrect if within 1 edit
            return minDist <= 1 ? best : tag;
        })
        .join(',');
}


async function load() {
    tbody.innerHTML = '';
    const items = await ipcRenderer.invoke('get-kaomojis', '');
    items.forEach(r => {
        const row = document.createElement('tr');
        row.dataset.id = r.id;
        row.innerHTML = `
      <td contenteditable data-placeholder="Enter kaomoji">${r.text || ''}</td>
      <td contenteditable data-placeholder="Enter tags (comma-separated)">${r.tags || ''}</td>
      <td>
        <button class="save">💾</button>
        <button class="del">🗑️</button>
      </td>
    `;
        tbody.appendChild(row);
    });
    attach();
    adjustWindow();
}

function attach() {
    tbody.querySelectorAll('.save').forEach(btn => {
        btn.onclick = async () => {
            const row = btn.closest('tr');
            const id = +row.dataset.id;
            const text = row.cells[0].innerText.trim();
            const raw  = row.cells[1].innerText.trim();
            const tags = (await correctTags(raw || '')) || '';
            console.log('Updating kaomoji:', { id, text, tags });
            await ipcRenderer.invoke('update-kaomoji', { id, text, tags });
            load();
        };
    });
    tbody.querySelectorAll('.del').forEach(btn => {
        btn.onclick = async () => {
            const id = +btn.closest('tr').dataset.id;
            await ipcRenderer.invoke('delete-kaomoji', id);
            load();
        };
    });
}

// src/db-renderer.js
addBtn.onclick = () => {
    const row = document.createElement('tr');
    row.innerHTML = `
    <td contenteditable data-placeholder="Enter kaomoji"></td>
    <td contenteditable data-placeholder="Enter tags (comma-separated)"></td>
    <td><button class="create">➕</button></td>
  `;
    tbody.appendChild(row);

    // scroll the table body into view
    const table = document.getElementById('editor');
    table.scrollTop = table.scrollHeight;

    const createBtn = row.querySelector('.create');
    createBtn.addEventListener('click', async () => {
        const textCell = row.cells[0];
        const tagsCell = row.cells[1];
        const text = textCell.innerText.trim();
        const raw  = tagsCell.innerText.trim();
        if (!text) return;                       // require kaomoji
        const tags = (await correctTags(raw || '')) || '';
        console.log('Adding kaomoji:', { text, tags });
        // invoke add and wait
        const newId = await ipcRenderer.invoke('add-kaomoji', { text, tags });
        console.log('Resulting ID:', newId);
        if (newId == null) {
            console.error('Failed to add kaomoji');
            return;
        }
        // clear and reload
        row.remove();
        await load();
    });


    adjustWindow();
};


createBtn.addEventListener('click', async () => {
    const text = row.cells[0]?.innerText.trim() || '';
    const raw  = row.cells[1]?.innerText.trim()  || '';
    const tags = await correctTags(raw);
    console.log('Adding kaomoji:', { text, tags });
    // both must be strings:
    if (typeof text !== 'string' || typeof tags !== 'string') return;
    const newId = await ipcRenderer.invoke('add-kaomoji', { text, tags });
    console.log('Resulting ID:', newId);
    row.remove();
    await load();
});



// auto-resize editor window
function adjustWindow() {
    const header = document.querySelector('.editor-title');
    const table  = document.getElementById('editor');
    const add    = document.getElementById('add-btn');
    const desired = header.offsetHeight + table.offsetHeight + add.offsetHeight + 48;
    ipcRenderer.send('resize-editor', { desired, min: 300 });
}
