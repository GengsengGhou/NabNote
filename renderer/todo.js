(function () {
  const api = window.nabnote;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!parts) return dateStr;
    return parts[1] + '/' + parts[2] + '/' + parts[3] + ' ' + parts[4] + ':' + parts[5];
  }

  function renderMarkdown(text) {
    var html = escapeHtml(text || '');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^\s*(?:- |\* )(.+)$/gm, '<div class="md-list-item">• $1</div>');
    return html.replace(/\n/g, '<br>');
  }

  function getTitle(content) {
    var lines = (content || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var title = lines[i].trim();
      if (title) return title.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '');
    }
    return '无标题';
  }

  function openNoteDetail(note) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var panel = document.createElement('div');
    panel.className = 'modal-panel note-detail-panel';

    var title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = getTitle(note.content);

    var content = document.createElement('div');
    content.className = 'note-detail-content';
    content.innerHTML = renderMarkdown(note.content || '');

    var actions = document.createElement('div');
    actions.className = 'modal-actions';

    var btnEdit = document.createElement('button');
    btnEdit.textContent = '编辑';

    var btnClose = document.createElement('button');
    btnClose.className = 'btn-primary';
    btnClose.textContent = '关闭';

    actions.appendChild(btnEdit);
    actions.appendChild(btnClose);
    panel.appendChild(title);
    panel.appendChild(content);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) document.body.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }

    btnEdit.addEventListener('click', function () {
      close();
      openEditNote(note);
    });
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
  }

  function openEditNote(note) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var panel = document.createElement('div');
    panel.className = 'modal-panel note-edit-panel';

    var title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '编辑待办';

    var textarea = document.createElement('textarea');
    textarea.className = 'modal-textarea';
    textarea.value = note.content || '';

    var actions = document.createElement('div');
    actions.className = 'modal-actions';

    var btnSave = document.createElement('button');
    btnSave.className = 'btn-primary';
    btnSave.textContent = '保存';

    var btnCancel = document.createElement('button');
    btnCancel.textContent = '取消';

    actions.appendChild(btnSave);
    actions.appendChild(btnCancel);
    panel.appendChild(title);
    panel.appendChild(textarea);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    textarea.focus();
    textarea.select();

    function close() {
      if (overlay.parentNode) document.body.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }

    async function saveNote() {
      var content = textarea.value.trim();
      if (!content) return;
      await api.updateNote(note.id, content);
      close();
      await refresh();
    }

    btnSave.addEventListener('click', saveNote);
    btnCancel.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    function onKey(e) {
      if (e.key === 'Escape') close();
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveNote();
      }
    }
    document.addEventListener('keydown', onKey);
  }

  function getMonthKey(dateStr) {
    if (!dateStr) return '未知';
    const parts = dateStr.match(/^(\d{4})-(\d{2})/);
    if (!parts) return '未知';
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    return year + '年' + month + '月';
  }

  function groupByMonth(notes) {
    const groups = {};
    notes.forEach(function (note) {
      const key = getMonthKey(note.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(note);
    });
    const entries = Object.entries(groups);
    entries.sort(function (a, b) {
      return b[0].localeCompare(a[0]);
    });
    return entries;
  }

  function renderMonthGroup(monthKey, notes, collapsed) {
    const section = document.createElement('div');
    section.className = 'month-group' + (collapsed ? ' collapsed' : '');

    const header = document.createElement('div');
    header.className = 'month-header';
    header.innerHTML = '<span class="month-arrow">' + (collapsed ? '▶' : '▼') + '</span> ' +
      '<span class="month-name">' + escapeHtml(monthKey) + '</span> ' +
      '<span class="month-count">(' + notes.length + ')</span>';

    const content = document.createElement('div');
    content.className = 'month-items';

    header.addEventListener('click', function () {
      const arrow = header.querySelector('.month-arrow');
      const isCollapsed = section.classList.toggle('collapsed');
      arrow.textContent = isCollapsed ? '▶' : '▼';
    });

    notes.forEach(function (note) {
      const item = document.createElement('div');
      item.className = 'note-item' + (note.is_done === 1 ? ' done' : '') + (note.is_pinned === 1 ? ' pinned' : '');

      const checkbox = document.createElement('div');
      checkbox.className = 'note-checkbox' + (note.is_done === 1 ? ' checked' : '');
      checkbox.addEventListener('click', async function (e) {
        e.stopPropagation();
        await api.toggleDone(note.id);
        await refresh();
      });

      const textWrap = document.createElement('div');
      textWrap.className = 'note-text-wrap';

      const contentSpan = document.createElement('span');
      contentSpan.className = 'note-text note-title' + (note.is_done === 1 ? ' done' : '');
      contentSpan.textContent = getTitle(note.content);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'note-time';
      timeSpan.textContent = formatTime(note.created_at);

      textWrap.appendChild(contentSpan);
      textWrap.appendChild(timeSpan);

      const actions = document.createElement('div');
      actions.className = 'note-actions';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'note-action note-pin' + (note.is_pinned === 1 ? ' active' : '');
      pinBtn.textContent = note.is_pinned === 1 ? '已置顶' : '置顶';
      pinBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        await api.toggleNotePinned(note.id);
        await refresh();
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'note-action note-edit';
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openEditNote(note);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'note-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', async function (e) {
        e.stopPropagation();
        if (confirm('确定删除此笔记？')) {
          await api.deleteNote(note.id);
          await refresh();
        }
      });

      actions.appendChild(pinBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(checkbox);
      item.appendChild(textWrap);
      item.appendChild(actions);
      item.addEventListener('click', function () {
        openNoteDetail(note);
      });
      content.appendChild(item);
    });

    section.appendChild(header);
    section.appendChild(content);
    return section;
  }

  function renderSection(title, notes, expandCount) {
    const container = document.createElement('div');
    container.className = 'todo-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.textContent = title;
    container.appendChild(header);

    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无笔记';
      container.appendChild(empty);
      return container;
    }

    const groups = groupByMonth(notes);
    groups.forEach(function (entry, index) {
      const collapsed = index >= expandCount;
      container.appendChild(renderMonthGroup(entry[0], entry[1], collapsed));
    });

    return container;
  }

  async function refresh() {
    const container = document.getElementById('notes-list');
    if (!container) return;

    const keyword = document.getElementById('todo-search') ? document.getElementById('todo-search').value.trim() : '';
    let notes;
    if (keyword) {
      notes = await api.searchNotes(keyword);
    } else {
      notes = await api.getNotes();
    }

    container.innerHTML = '';

    const undone = notes.filter(function (n) { return n.is_done === 0; });
    const done = notes.filter(function (n) { return n.is_done === 1; });

    container.appendChild(renderSection('── 未完成 ──', undone, 2));
    container.appendChild(renderSection('── 已完成 ──', done, 1));

    const statusbar = document.getElementById('statusbar');
    if (statusbar) {
      statusbar.textContent = '共 ' + notes.length + ' 条，已完成 ' + done.length + ' 条';
    }
  }

  function init() {
    const noteInput = document.getElementById('note-input');
    if (noteInput) {
      noteInput.addEventListener('keydown', async function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const content = noteInput.value.trim();
          if (!content) return;
          await api.addNote(content);
          noteInput.value = '';
          await refresh();
        }
      });
    }

    const searchInput = document.getElementById('todo-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        refresh();
      });
    }
  }

  function getScrollElement() {
    return document.getElementById('notes-list');
  }

  window.TodoModule = {
    init: init,
    refresh: refresh,
    getScrollElement: getScrollElement
  };
})();
