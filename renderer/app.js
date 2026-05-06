const noteInput = document.getElementById('note-input')
const searchInput = document.getElementById('search-input')
const notesList = document.getElementById('notes-list')
const statusbar = document.getElementById('statusbar')
const btnMinimize = document.getElementById('btn-minimize')
const btnClose = document.getElementById('btn-close')

let allNotes = []
let currentSearch = ''

noteInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    const content = noteInput.value.trim()
    if (!content) return
    await window.nabnote.addNote(content)
    noteInput.value = ''
    await refreshNotes()
  }
})

searchInput.addEventListener('input', async () => {
  currentSearch = searchInput.value.trim()
  await refreshNotes()
})

btnMinimize.addEventListener('click', () => {
  window.nabnote.minimizeWindow()
})

btnClose.addEventListener('click', () => {
  window.nabnote.closeWindow()
})

async function refreshNotes() {
  if (currentSearch) {
    allNotes = await window.nabnote.searchNotes(currentSearch)
  } else {
    allNotes = await window.nabnote.getNotes()
  }
  renderNotes()
  updateStatus()
}

function renderNotes() {
  if (allNotes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div>${currentSearch ? '没有找到匹配的笔记' : '还没有笔记，开始记录吧'}</div>
      </div>
    `
    return
  }

  const undone = allNotes.filter(n => n.is_done === 0)
  const done = allNotes.filter(n => n.is_done === 1)
  const sorted = [...undone, ...done]

  notesList.innerHTML = sorted.map(note => `
    <div class="note-item${note.is_done ? ' done' : ''}" data-id="${note.id}">
      <input type="checkbox" class="note-checkbox" ${note.is_done ? 'checked' : ''} data-id="${note.id}" />
      <div class="note-content-area">
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-time">${formatTime(note.created_at)}</div>
      </div>
      <button class="note-delete" data-id="${note.id}" title="删除">&#x1F5D1;</button>
    </div>
  `).join('')

  notesList.querySelectorAll('.note-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = parseInt(cb.dataset.id)
      await window.nabnote.toggleDone(id)
      await refreshNotes()
    })
  })

  notesList.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id)
      if (confirm('确定要删除这条笔记吗？')) {
        await window.nabnote.deleteNote(id)
        await refreshNotes()
      }
    })
  })
}

function updateStatus() {
  const total = allNotes.length
  const doneCount = allNotes.filter(n => n.is_done === 1).length
  statusbar.textContent = `共 ${total} 条笔记 · 已完成 ${doneCount} 条`
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.replace('T', ' ').substring(0, 16)
}

document.addEventListener('DOMContentLoaded', () => {
  noteInput.focus()
  refreshNotes()
})
