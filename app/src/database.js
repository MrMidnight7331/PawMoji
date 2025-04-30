const initSqlJs = require('sql.js');
const fs = require('fs');

let db, SQL;
module.exports = {
    init: async (file) => {
        SQL = await initSqlJs();
        const data = fs.existsSync(file) ? fs.readFileSync(file) : new Uint8Array();
        db = new SQL.Database(data);
    },
    ensureSchema: () => db.run(`CREATE TABLE IF NOT EXISTS kaomoji (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, tags TEXT)`),
    fetch: (tag) => {
        const stmt = db.prepare(`SELECT id,text,tags FROM kaomoji`);
        const all = [];
        while (stmt.step()) all.push(stmt.getAsObject());
        stmt.free();
        return tag ? all.filter(r => r.tags.split(',').map(t => t.trim()).includes(tag)) : all;
    },
    getTags: () => {
        const stmt = db.prepare(`SELECT tags FROM kaomoji`);
        const set = new Set();
        while (stmt.step()) stmt.getAsObject().tags.split(',').forEach(t => set.add(t.trim()));
        stmt.free();
        return [...set].filter(t => t);
    },
    add: (text, tags) => { db.run(`INSERT INTO kaomoji(text,tags) VALUES(?,?)`, [text, tags]); return db.exec(`SELECT last_insert_rowid() AS id`)[0].values[0][0]; },
    update: (id, text, tags) => db.run(`UPDATE kaomoji SET text=?,tags=? WHERE id=?`, [text, tags, id]),
    remove: (id) => db.run(`DELETE FROM kaomoji WHERE id=?`, [id]),
    save: (file) => fs.writeFileSync(file, Buffer.from(db.export())),
};