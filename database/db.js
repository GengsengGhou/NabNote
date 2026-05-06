const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db
let dbPath

async function init() {
  const SQL = await initSqlJs()
  dbPath = path.join(app.getPath('userData'), 'nabnote.db')

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      is_done INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  save()
  return db
}

function save() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function queryAll(sql, params) {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql, params) {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

function runSql(sql, params) {
  if (params) {
    db.run(sql, params)
  } else {
    db.run(sql)
  }
  save()
}

function getAll() {
  return queryAll(`
    SELECT * FROM notes
    ORDER BY is_done ASC, created_at DESC
  `)
}

function search(keyword) {
  return queryAll(`
    SELECT * FROM notes
    WHERE content LIKE ?
    ORDER BY is_done ASC, created_at DESC
  `, [`%${keyword}%`])
}

function add(content) {
  runSql('INSERT INTO notes (content) VALUES (?)', [content])
  const lastId = queryOne('SELECT last_insert_rowid() as id').id
  return queryOne('SELECT * FROM notes WHERE id = ?', [lastId])
}

function toggleDone(id) {
  runSql(`
    UPDATE notes SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END,
                    updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `, [id])
  return queryOne('SELECT * FROM notes WHERE id = ?', [id])
}

function deleteNote(id) {
  runSql('DELETE FROM notes WHERE id = ?', [id])
  return { success: true }
}

function close() {
  if (db) {
    save()
    db.close()
  }
}

module.exports = { init, getAll, search, add, toggleDone, deleteNote, close }
