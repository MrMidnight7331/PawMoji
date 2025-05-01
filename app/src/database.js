const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db, SQL;

module.exports = {
    init: async (dbFile) => {
        SQL = await initSqlJs({
            locateFile: file => path.join(__dirname, '../node_modules/sql.js/dist/', file)
        });
        const fullPath = path.resolve(dbFile);
        const data = fs.existsSync(fullPath) ? fs.readFileSync(fullPath) : new Uint8Array();
        db = new SQL.Database(data);
        module.exports.ensureSchema();
    },

    ensureSchema: () => {
        db.run(`
      CREATE TABLE IF NOT EXISTS kaomoji (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        tags TEXT DEFAULT ''
      )
    `);
    },

    fetch: (tag) => {
        const rows = db.exec(`SELECT id, text, tags FROM kaomoji`);
        if (!rows.length) return [];
        const all = rows[0].values.map(r => ({ id: r[0], text: r[1], tags: r[2] }));
        return tag
            ? all.filter(r => r.tags.split(',').map(t => t.trim()).includes(tag))
            : all;
    },

    getTags: () => {
        const rows = db.exec(`SELECT tags FROM kaomoji`);
        const set = new Set();
        rows.forEach(({ values }) => {
            values.forEach(([tags]) =>
                tags.split(',').forEach(t => t.trim() && set.add(t.trim()))
            );
        });
        return Array.from(set);
    },

    add: (text, tags) => {
        const stmt = db.prepare(`INSERT INTO kaomoji (text, tags) VALUES (?, ?)`);
        stmt.run([text, tags]);
        stmt.free();
        const [[id]] = db.exec(`SELECT last_insert_rowid() AS id`)[0].values;
        return id;
    },

    update: (id, text, tags) => {
        const stmt = db.prepare(`UPDATE kaomoji SET text = ?, tags = ? WHERE id = ?`);
        stmt.run([text, tags, id]);
        stmt.free();
    },

    remove: (id) => {
        const stmt = db.prepare(`DELETE FROM kaomoji WHERE id = ?`);
        stmt.run([id]);
        stmt.free();
    },

    save: (dbFile) => {
        const fullPath = path.resolve(dbFile);
        fs.writeFileSync(fullPath, Buffer.from(db.export()));
    }
};