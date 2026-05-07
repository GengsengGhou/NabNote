const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

let db
let dbPath
let imagesDir

const CURRENT_SCHEMA_VERSION = 4

const MIGRATIONS = [
  {
    version: 1,
    up: function () {
      db.run(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          is_done INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
      `)
    }
  },
  {
    version: 2,
    up: function () {
      db.run(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER DEFAULT NULL,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (parent_id) REFERENCES folders(id)
        )
      `)
      db.run(`
        CREATE TABLE IF NOT EXISTS ideas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT DEFAULT '',
          folder_id INTEGER DEFAULT NULL,
          images TEXT DEFAULT '[]',
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (folder_id) REFERENCES folders(id)
        )
      `)
      db.run(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)
      db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('theme', 'dark')`)
    }
  },
  {
    version: 3,
    up: function () {
      var ideas = queryAll('SELECT * FROM ideas')
      for (var i = 0; i < ideas.length; i++) {
        var idea = ideas[i]
        var content = idea.content || ''
        var images = []
        try { images = JSON.parse(idea.images || '[]') } catch (e) {}
        content = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')
        for (var j = 0; j < images.length; j++) {
          content += '<br><img data-filename="' + images[j] + '">'
        }
        db.run('UPDATE ideas SET content = ? WHERE id = ?', [content, idea.id])
      }
    }
  },
  {
    version: 4,
    up: function () {
      const notePinned = queryOne("SELECT name FROM pragma_table_info('notes') WHERE name = 'is_pinned'")
      if (!notePinned) {
        db.run('ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0')
      }
      const ideaPinned = queryOne("SELECT name FROM pragma_table_info('ideas') WHERE name = 'is_pinned'")
      if (!ideaPinned) {
        db.run('ALTER TABLE ideas ADD COLUMN is_pinned INTEGER DEFAULT 0')
      }
    }
  }
]

function getSchemaVersion() {
  try {
    const row = queryOne('SELECT value FROM meta WHERE key = ?', ['schema_version'])
    if (row) return parseInt(row.value, 10)
  } catch (e) {}
  return 0
}

function setSchemaVersion(version) {
  db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['schema_version', String(version)])
}

function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  let currentVersion = getSchemaVersion()

  if (currentVersion === 0) {
    const hasNotes = queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
    if (hasNotes) {
      currentVersion = 1
      setSchemaVersion(1)
    }
  }

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      migration.up()
      setSchemaVersion(migration.version)
    }
  }
}

async function init(app) {
  const SQL = await initSqlJs()
  const dataDir = app.getPath('userData')
  dbPath = path.join(dataDir, 'nabnote.db')
  imagesDir = path.join(dataDir, 'images')

  try {
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create images directory:', e.message)
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  runMigrations()
  save()
  return db
}

function save() {
  if (!db) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Failed to save database:', e.message)
  }
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
    ORDER BY is_pinned DESC, is_done ASC, created_at DESC
  `)
}

function search(keyword) {
  return queryAll(`
    SELECT * FROM notes
    WHERE content LIKE ?
    ORDER BY is_pinned DESC, is_done ASC, created_at DESC
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

function updateNote(id, content) {
  runSql(`
    UPDATE notes SET content = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `, [content, id])
  return queryOne('SELECT * FROM notes WHERE id = ?', [id])
}

function toggleNotePinned(id) {
  runSql(`
    UPDATE notes SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END,
                     updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `, [id])
  return queryOne('SELECT * FROM notes WHERE id = ?', [id])
}

function deleteNote(id) {
  runSql('DELETE FROM notes WHERE id = ?', [id])
  return { success: true }
}

function getFoldersByParent(parentId) {
  if (parentId === null || parentId === undefined) {
    return queryAll(`
      SELECT * FROM folders WHERE parent_id IS NULL
      ORDER BY name ASC
    `)
  }
  return queryAll(`
    SELECT * FROM folders WHERE parent_id = ?
    ORDER BY name ASC
  `, [parentId])
}

function createFolder(name, parentId) {
  if (parentId === null || parentId === undefined) {
    runSql('INSERT INTO folders (name, parent_id) VALUES (?, NULL)', [name])
  } else {
    runSql('INSERT INTO folders (name, parent_id) VALUES (?, ?)', [name, parentId])
  }
  const lastId = queryOne('SELECT last_insert_rowid() as id').id
  return queryOne('SELECT * FROM folders WHERE id = ?', [lastId])
}

function renameFolder(id, name) {
  runSql('UPDATE folders SET name = ? WHERE id = ?', [name, id])
  return queryOne('SELECT * FROM folders WHERE id = ?', [id])
}

function deleteFolder(id) {
  const childFolders = queryAll('SELECT id FROM folders WHERE parent_id = ?', [id])
  if (childFolders.length > 0) {
    return { success: false, error: '文件夹不为空，无法删除' }
  }
  const childIdeas = queryAll('SELECT id FROM ideas WHERE folder_id = ?', [id])
  if (childIdeas.length > 0) {
    return { success: false, error: '文件夹不为空，无法删除' }
  }
  runSql('DELETE FROM folders WHERE id = ?', [id])
  return { success: true }
}

function getIdeasByFolder(folderId) {
  if (folderId === null || folderId === undefined) {
    return queryAll(`
      SELECT * FROM ideas WHERE folder_id IS NULL
      ORDER BY is_pinned DESC, created_at DESC
    `)
  }
  return queryAll(`
    SELECT * FROM ideas WHERE folder_id = ?
    ORDER BY is_pinned DESC, created_at DESC
  `, [folderId])
}

function createIdea(content, folderId, images) {
  if (folderId === null || folderId === undefined) {
    runSql('INSERT INTO ideas (content, folder_id) VALUES (?, NULL)', [content])
  } else {
    runSql('INSERT INTO ideas (content, folder_id) VALUES (?, ?)', [content, folderId])
  }
  const lastId = queryOne('SELECT last_insert_rowid() as id').id
  return queryOne('SELECT * FROM ideas WHERE id = ?', [lastId])
}

function updateIdea(id, content, images) {
  runSql(`
    UPDATE ideas SET content = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `, [content, id])
  return queryOne('SELECT * FROM ideas WHERE id = ?', [id])
}

function toggleIdeaPinned(id) {
  runSql(`
    UPDATE ideas SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END,
                     updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `, [id])
  return queryOne('SELECT * FROM ideas WHERE id = ?', [id])
}

function deleteIdea(id) {
  const idea = queryOne('SELECT * FROM ideas WHERE id = ?', [id])
  if (idea) {
    var regex = /data-filename="([^"]+)"/g
    var match
    while ((match = regex.exec(idea.content || '')) !== null) {
      try {
        var filePath = path.join(imagesDir, match[1])
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      } catch (e) {}
    }
    try {
      var oldImages = JSON.parse(idea.images || '[]')
      oldImages.forEach(function (filename) {
        try {
          var filePath = path.join(imagesDir, filename)
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        } catch (e) {}
      })
    } catch (e) {}
  }
  runSql('DELETE FROM ideas WHERE id = ?', [id])
  return { success: true }
}

function searchIdeas(keyword, folderId) {
  if (folderId === null || folderId === undefined) {
    return queryAll(`
      SELECT * FROM ideas WHERE folder_id IS NULL AND content LIKE ?
      ORDER BY is_pinned DESC, created_at DESC
    `, [`%${keyword}%`])
  }
  return queryAll(`
    SELECT * FROM ideas WHERE folder_id = ? AND content LIKE ?
    ORDER BY is_pinned DESC, created_at DESC
  `, [folderId, `%${keyword}%`])
}

function getConfig(key) {
  const row = queryOne('SELECT value FROM config WHERE key = ?', [key])
  return row ? row.value : null
}

function setConfig(key, value) {
  runSql('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value])
  return { success: true }
}

function saveImage(dataUrl) {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return { filename: '' }
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6)
  const filename = `${timestamp}_${random}.${ext}`
  const filePath = path.join(imagesDir, filename)
  fs.writeFileSync(filePath, buffer)
  return { filename }
}

function deleteImage(filename) {
  const filePath = path.join(imagesDir, filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  return { success: true }
}

function getImagePath(filename) {
  return { filePath: path.join(imagesDir, filename) }
}

function getFolderPath(id) {
  const parts = []
  let currentId = id
  while (currentId) {
    const folder = queryOne('SELECT id, name, parent_id FROM folders WHERE id = ?', [currentId])
    if (!folder) break
    parts.unshift({ id: folder.id, name: folder.name })
    currentId = folder.parent_id
  }
  return parts
}

function close() {
  if (db) {
    save()
    db.close()
  }
}

module.exports = {
  init, getAll, search, add, toggleDone, updateNote, toggleNotePinned, deleteNote,
  getFoldersByParent, createFolder, renameFolder, deleteFolder,
  getIdeasByFolder, createIdea, updateIdea, toggleIdeaPinned, deleteIdea, searchIdeas,
  getConfig, setConfig,
  saveImage, deleteImage, getImagePath,
  getFolderPath, close
}
