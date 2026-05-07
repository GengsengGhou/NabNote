(function () {
  var api = window.nabnote;

  var currentFolderId = null;
  var breadcrumbPath = [];
  var searchKeyword = '';
  var imageCache = new Map();

  var contextMenu = null;

  async function loadImagePath(filename) {
    if (imageCache.has(filename)) return imageCache.get(filename);
    var result = await api.getImagePath(filename);
    imageCache.set(filename, result.filePath);
    return result.filePath;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!parts) return dateStr;
    return parts[1] + '/' + parts[2] + '/' + parts[3] + ' ' + parts[4] + ':' + parts[5];
  }

  function renderMarkdown(text) {
    var raw = normalizeContentForEdit(text || '');
    var html = escapeHtml(raw);
    html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, function (_match, alt, src) {
      if (/^https?:\/\//.test(src)) return '<img src="' + src + '" alt="' + alt + '">';
      return '<img data-filename="' + src + '" alt="' + alt + '">';
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^\s*(?:- |\* )(.+)$/gm, '<div class="md-list-item">• $1</div>');
    html = html.replace(/\n/g, '<br>');
    return html.replace(/(?:<br>\s*)*(<img\b[^>]*>)(?:\s*<br>)*/g, '$1');
  }

  function contentToEditorHtml(content) {
    var raw = normalizeContentForEdit(content || '');
    var html = escapeHtml(raw);
    html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, function (_match, alt, src) {
      if (/^https?:\/\//.test(src)) return '<img src="' + src + '" alt="' + alt + '">';
      return '<img data-filename="' + src + '" alt="' + alt + '">';
    });
    return html.replace(/\n/g, '<br>');
  }

  function getTitle(content) {
    var raw = normalizeContentForEdit(content || '');
    var lines = raw.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var title = lines[i].trim();
      if (title) return title.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '');
    }
    return '无标题';
  }

  function getBody(content) {
    var raw = normalizeContentForEdit(content || '');
    var lines = raw.split(/\r?\n/);
    var firstContentLine = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        firstContentLine = i;
        break;
      }
    }
    if (firstContentLine === -1) return '';
    return lines.slice(firstContentLine + 1).join('\n').trim();
  }

  function normalizeContentForEdit(content) {
    if (!/<(br|img|p|div|h[1-6]|ul|ol|li|strong|em|code|a)\b/i.test(content || '')) {
      return content || '';
    }

    var div = document.createElement('div');
    div.innerHTML = content || '';

    div.querySelectorAll('img[data-filename]').forEach(function (img) {
      img.replaceWith(document.createTextNode('\n![](' + img.getAttribute('data-filename') + ')\n'));
    });

    div.querySelectorAll('br').forEach(function (br) {
      br.replaceWith(document.createTextNode('\n'));
    });

    ['p', 'div', 'h1', 'h2', 'h3', 'li'].forEach(function (tag) {
      div.querySelectorAll(tag).forEach(function (el) {
        el.appendChild(document.createTextNode('\n'));
      });
    });

    div.querySelectorAll('strong, b').forEach(function (el) {
      el.replaceWith(document.createTextNode('**' + (el.textContent || '') + '**'));
    });
    div.querySelectorAll('em, i').forEach(function (el) {
      el.replaceWith(document.createTextNode('*' + (el.textContent || '') + '*'));
    });
    div.querySelectorAll('code').forEach(function (el) {
      el.replaceWith(document.createTextNode('`' + (el.textContent || '') + '`'));
    });
    div.querySelectorAll('a[href]').forEach(function (el) {
      el.replaceWith(document.createTextNode('[' + (el.textContent || el.getAttribute('href')) + '](' + el.getAttribute('href') + ')'));
    });

    return (div.textContent || div.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function dismissContextMenu() {
    if (contextMenu && contextMenu.parentNode) {
      contextMenu.parentNode.removeChild(contextMenu);
      contextMenu = null;
    }
  }

  function showContextMenu(x, y, items) {
    dismissContextMenu();
    contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    items.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      el.textContent = item.label;
      el.addEventListener('click', function () {
        dismissContextMenu();
        item.action();
      });
      contextMenu.appendChild(el);
    });
    document.body.appendChild(contextMenu);
  }

  function showModal(opts) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      var panel = document.createElement('div');
      panel.className = 'modal-panel';

      if (opts.title) {
        var title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = opts.title;
        panel.appendChild(title);
      }

      if (opts.message) {
        var msg = document.createElement('div');
        msg.className = 'modal-message';
        msg.textContent = opts.message;
        panel.appendChild(msg);
      }

      var input = null;
      if (opts.input) {
        input = document.createElement('input');
        input.className = 'modal-input';
        input.type = 'text';
        input.value = opts.inputValue || '';
        input.placeholder = opts.inputPlaceholder || '';
        panel.appendChild(input);
      }

      var actions = document.createElement('div');
      actions.className = 'modal-actions';

      var btnConfirm = document.createElement('button');
      btnConfirm.className = 'btn-primary';
      btnConfirm.textContent = opts.confirmText || '确定';
      btnConfirm.addEventListener('click', function () {
        document.body.removeChild(overlay);
        resolve(input ? input.value.trim() : true);
      });

      var btnCancel = document.createElement('button');
      btnCancel.textContent = opts.cancelText || '取消';
      btnCancel.addEventListener('click', function () {
        document.body.removeChild(overlay);
        resolve(input ? null : false);
      });

      actions.appendChild(btnConfirm);
      actions.appendChild(btnCancel);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      if (input) {
        input.focus();
        input.select();
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            document.body.removeChild(overlay);
            resolve(input.value.trim());
          }
        });
      }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
          resolve(input ? null : false);
        }
      });

      function onKey(e) {
        if (e.key === 'Escape') {
          if (overlay.parentNode) document.body.removeChild(overlay);
          document.removeEventListener('keydown', onKey);
          resolve(input ? null : false);
        }
      }
      document.addEventListener('keydown', onKey);
    });
  }

  function renderBreadcrumb() {
    var container = document.getElementById('ideas-breadcrumb');
    if (!container) return;
    container.innerHTML = '';

    var rootSpan = document.createElement('span');
    rootSpan.className = 'breadcrumb-item';
    rootSpan.textContent = '想法';
    rootSpan.addEventListener('click', function () {
      currentFolderId = null;
      breadcrumbPath = [];
      refresh();
    });
    container.appendChild(rootSpan);

    if (breadcrumbPath.length === 0) return;

    if (breadcrumbPath.length > 3) {
      var sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = ' > ';
      container.appendChild(sep);

      var dots = document.createElement('span');
      dots.className = 'breadcrumb-dots';
      dots.textContent = '...';
      container.appendChild(dots);
    }

    var startIdx = breadcrumbPath.length > 3 ? breadcrumbPath.length - 2 : 0;
    for (var i = startIdx; i < breadcrumbPath.length; i++) {
      var sep2 = document.createElement('span');
      sep2.className = 'breadcrumb-sep';
      sep2.textContent = ' > ';
      container.appendChild(sep2);

      var span = document.createElement('span');
      span.className = 'breadcrumb-item';
      span.textContent = breadcrumbPath[i].name;
      (function (idx) {
        span.addEventListener('click', function () {
          currentFolderId = breadcrumbPath[idx].id;
          breadcrumbPath = breadcrumbPath.slice(0, idx + 1);
          refresh();
        });
      })(i);
      container.appendChild(span);
    }
  }

  function ensureGrids() {
    var content = document.getElementById('ideas-content');
    if (!content) return { folderGrid: null, cardGrid: null };

    var folderGrid = content.querySelector('.folder-grid');
    var cardGrid = content.querySelector('.card-grid');

    if (!folderGrid) {
      folderGrid = document.createElement('div');
      folderGrid.className = 'folder-grid';
      content.appendChild(folderGrid);
    }

    if (!cardGrid) {
      cardGrid = document.createElement('div');
      cardGrid.className = 'card-grid';
      content.appendChild(cardGrid);
    }

    return { folderGrid: folderGrid, cardGrid: cardGrid };
  }

  async function renderFolders(folders) {
    var grids = ensureGrids();
    var folderGrid = grids.folderGrid;
    if (!folderGrid) return;
    folderGrid.innerHTML = '';

    for (var i = 0; i < folders.length; i++) {
      (function (folder) {
        var item = document.createElement('div');
        item.className = 'folder-item';

        var subCount = 0;
        try {
          api.getFoldersByParent(folder.id).then(function (sub) {
            return api.getIdeasByFolder(folder.id).then(function (ideas) {
              var countEl = item.querySelector('.folder-count');
              if (countEl) countEl.textContent = '(' + (sub.length + ideas.length) + ')';
            });
          });
        } catch (e) {}

        item.innerHTML = '<span class="folder-icon">📁</span> ' +
          '<span class="folder-name">' + escapeHtml(folder.name) + '</span> ' +
          '<span class="folder-count">(' + subCount + ')</span>';

        item.addEventListener('dblclick', function () {
          currentFolderId = folder.id;
          breadcrumbPath.push({ id: folder.id, name: folder.name });
          refresh();
        });

        item.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          showContextMenu(e.clientX, e.clientY, [
            {
              label: '重命名',
              action: async function () {
                var newName = await showModal({
                  title: '重命名文件夹',
                  input: true,
                  inputValue: folder.name,
                  inputPlaceholder: '输入新名称'
                });
                if (newName) {
                  await api.renameFolder(folder.id, newName);
                  breadcrumbPath = breadcrumbPath.map(function (b) {
                    if (b.id === folder.id) return { id: b.id, name: newName };
                    return b;
                  });
                  await refresh();
                }
              }
            },
            {
              label: '删除',
              danger: true,
              action: async function () {
                var confirmed = await showModal({
                  title: '删除文件夹',
                  message: '确定删除「' + folder.name + '」？'
                });
                if (confirmed) {
                  var result = await api.deleteFolder(folder.id);
                  if (result && !result.success) {
                    await showModal({
                      title: '无法删除',
                      message: result.error || '删除失败'
                    });
                  } else {
                    await refresh();
                  }
                }
              }
            }
          ]);
        });

        folderGrid.appendChild(item);
      })(folders[i]);
    }
  }

  function resolveImageSrc(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    var imgs = div.querySelectorAll('img[data-filename]');
    var promises = [];
    imgs.forEach(function (img) {
      var filename = img.getAttribute('data-filename');
      promises.push(loadImagePath(filename).then(function (p) {
        img.setAttribute('src', p);
      }));
    });
    return Promise.all(promises).then(function () {
      return div.innerHTML;
    });
  }

  async function renderCards(ideas) {
    var grids = ensureGrids();
    var cardGrid = grids.cardGrid;
    if (!cardGrid) return;
    cardGrid.innerHTML = '';

    if (ideas.length === 0 && !searchKeyword) {
      cardGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💡</div><div class="empty-state-text">还没有想法卡片</div></div>';
      return;
    }

    for (var i = 0; i < ideas.length; i++) {
      await (async function (idea) {
        var item = document.createElement('div');
        item.className = 'card-item' + (idea.is_pinned === 1 ? ' pinned' : '');

        var previewHtml = renderMarkdown(getBody(idea.content));
        previewHtml = await resolveImageSrc(previewHtml);
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = previewHtml;
        var textContent = tempDiv.textContent || tempDiv.innerText || '';
        var truncated = textContent.length > 80 ? textContent.substring(0, 80) + '...' : textContent;

        var previewDiv = document.createElement('div');
        previewDiv.className = 'card-preview';
        previewDiv.innerHTML = previewHtml;

        item.innerHTML = '';

        var titleDiv = document.createElement('div');
        titleDiv.className = 'card-title';
        titleDiv.textContent = getTitle(idea.content);
        item.appendChild(titleDiv);

        item.appendChild(previewDiv);

        var textDiv = document.createElement('div');
        textDiv.className = 'card-text';
        textDiv.textContent = truncated;
        item.appendChild(textDiv);

        var timeDiv = document.createElement('div');
        timeDiv.className = 'card-time';
        timeDiv.textContent = formatTime(idea.created_at);
        item.appendChild(timeDiv);

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          var confirmed = await showModal({
            title: '删除卡片',
            message: '确定删除此卡片？'
          });
          if (confirmed) {
            await api.deleteIdea(idea.id);
            await refresh();
          }
        });
        item.appendChild(deleteBtn);

        var pinBtn = document.createElement('button');
        pinBtn.className = 'card-pin' + (idea.is_pinned === 1 ? ' active' : '');
        pinBtn.textContent = idea.is_pinned === 1 ? '已置顶' : '置顶';
        pinBtn.addEventListener('click', async function (e) {
          e.stopPropagation();
          await api.toggleIdeaPinned(idea.id);
          await refresh();
        });
        item.appendChild(pinBtn);

        item.addEventListener('click', function () {
          openCardDetail(idea);
        });

        cardGrid.appendChild(item);
      })(ideas[i]);
    }
  }

  async function openCardDetail(idea) {
    var overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    var panel = document.createElement('div');
    panel.className = 'card-detail';

    var contentHtml = renderMarkdown(idea.content || '');
    contentHtml = await resolveImageSrc(contentHtml);

    var folderPathStr = '';
    if (idea.folder_id) {
      try {
        var pathParts = await api.getFolderPath(idea.folder_id);
        if (Array.isArray(pathParts)) {
          folderPathStr = pathParts.map(function (p) { return p.name; }).join(' > ');
        }
      } catch (e) {}
    }

    var contentDiv = document.createElement('div');
    contentDiv.className = 'card-detail-content';
    contentDiv.innerHTML = contentHtml;

    var timeDiv = document.createElement('div');
    timeDiv.className = 'card-detail-time';
    timeDiv.textContent = formatTime(idea.created_at) +
      (folderPathStr ? ' · ' + folderPathStr : '');

    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-detail-actions';

    var btnEdit = document.createElement('button');
    btnEdit.className = 'btn-detail-edit';
    btnEdit.textContent = '编辑';

    var btnPin = document.createElement('button');
    btnPin.textContent = idea.is_pinned === 1 ? '取消置顶' : '置顶';

    var btnClose = document.createElement('button');
    btnClose.className = 'btn-detail-close';
    btnClose.textContent = '关闭';

    actionsDiv.appendChild(btnPin);
    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnClose);

    panel.appendChild(contentDiv);
    panel.appendChild(timeDiv);
    panel.appendChild(actionsDiv);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    btnClose.addEventListener('click', function () {
      document.body.removeChild(overlay);
    });

    btnEdit.addEventListener('click', function () {
      document.body.removeChild(overlay);
      openCardEdit(idea);
    });

    btnPin.addEventListener('click', async function () {
      await api.toggleIdeaPinned(idea.id);
      document.body.removeChild(overlay);
      await refresh();
    });

    function onKey(e) {
      if (e.key === 'Escape') {
        if (overlay.parentNode) document.body.removeChild(overlay);
        document.removeEventListener('keydown', onKey);
      }
    }
    document.addEventListener('keydown', onKey);
  }

  async function createEditor(idea) {
    var overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    var panel = document.createElement('div');
    panel.className = 'card-detail card-edit-panel';

    var toolbar = document.createElement('div');
    toolbar.className = 'editor-toolbar';

    var btnImg = document.createElement('button');
    btnImg.className = 'editor-toolbar-btn';
    btnImg.textContent = '📷 图片';
    btnImg.title = '粘贴或拖拽图片';

    toolbar.appendChild(btnImg);

    var editor = document.createElement('div');
    editor.className = 'editor-content';
    editor.contentEditable = 'true';
    editor.setAttribute('data-placeholder', '输入想法，可粘贴或拖拽图片...');

    if (idea && idea.content) {
      editor.innerHTML = await resolveImageSrc(contentToEditorHtml(idea.content));
    }

    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-detail-actions';

    var btnSave = document.createElement('button');
    btnSave.className = 'btn-primary';
    btnSave.textContent = '保存';

    var btnCancel = document.createElement('button');
    btnCancel.textContent = '取消';

    actionsDiv.appendChild(btnSave);
    actionsDiv.appendChild(btnCancel);

    panel.appendChild(toolbar);
    panel.appendChild(editor);
    panel.appendChild(actionsDiv);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    editor.focus();

    function getEditorContent() {
      return normalizeContentForEdit(editor.innerHTML);
    }

    function closeEditor() {
      document.body.removeChild(overlay);
      document.removeEventListener('paste', handlePaste);
    }

    async function handlePaste(e) {
      if (!overlay.parentNode) {
        document.removeEventListener('paste', handlePaste);
        return;
      }
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          var blob = items[i].getAsFile();
          var reader = new FileReader();
          reader.onload = async function (ev) {
            var dataUrl = ev.target.result;
            var result = await api.saveImage(dataUrl);
            await loadImagePath(result.filename);
            var img = document.createElement('img');
            img.setAttribute('data-filename', result.filename);
            img.setAttribute('src', imageCache.get(result.filename) || '');
            var selection = window.getSelection();
            if (selection.rangeCount > 0) {
              var range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              range.collapse(false);
            } else {
              editor.appendChild(img);
            }
            var br = document.createElement('br');
            img.parentNode.insertBefore(br, img.nextSibling);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }

    panel.addEventListener('dragover', function (e) {
      e.preventDefault();
    });

    panel.addEventListener('drop', async function (e) {
      e.preventDefault();
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          var reader = new FileReader();
          reader.onload = async function (ev) {
            var dataUrl = ev.target.result;
            var result = await api.saveImage(dataUrl);
            await loadImagePath(result.filename);
            var img = document.createElement('img');
            img.setAttribute('data-filename', result.filename);
            img.setAttribute('src', imageCache.get(result.filename) || '');
            editor.appendChild(img);
            var br = document.createElement('br');
            editor.appendChild(br);
          };
          reader.readAsDataURL(files[i]);
        }
      }
    });

    btnImg.addEventListener('click', function () {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.addEventListener('change', async function () {
        var files = fileInput.files;
        for (var i = 0; i < files.length; i++) {
          var reader = new FileReader();
          reader.onload = async function (ev) {
            var dataUrl = ev.target.result;
            var result = await api.saveImage(dataUrl);
            await loadImagePath(result.filename);
            var img = document.createElement('img');
            img.setAttribute('data-filename', result.filename);
            img.setAttribute('src', imageCache.get(result.filename) || '');
            editor.appendChild(img);
            var br = document.createElement('br');
            editor.appendChild(br);
          };
          reader.readAsDataURL(files[i]);
        }
      });
      fileInput.click();
    });

    document.addEventListener('paste', handlePaste);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeEditor();
      }
    });

    btnCancel.addEventListener('click', function () {
      closeEditor();
    });

    btnSave.addEventListener('click', async function () {
      var content = getEditorContent();
      if (idea && idea.id) {
        await api.updateIdea(idea.id, content);
      } else {
        await api.createIdea(content, currentFolderId);
      }
      closeEditor();
      await refresh();
    });

    function onKey(e) {
      if (e.key === 'Escape') {
        closeEditor();
        document.removeEventListener('keydown', onKey);
      }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        btnSave.click();
      }
    }
    document.addEventListener('keydown', onKey);

    return { overlay: overlay, getEditorContent: getEditorContent, closeEditor: closeEditor };
  }

  function openCardEdit(idea) {
    createEditor(idea);
  }

  function openNewCard() {
    createEditor(null);
  }

  async function refresh() {
    renderBreadcrumb();

    var content = document.getElementById('ideas-content');
    if (!content) return;

    content.innerHTML = '';
    var grids = ensureGrids();

    if (searchKeyword) {
      grids.folderGrid.style.display = 'none';
      grids.cardGrid.innerHTML = '';
      var ideas = await api.searchIdeas(searchKeyword, currentFolderId);
      await renderCards(ideas);
    } else {
      grids.folderGrid.style.display = '';
      grids.folderGrid.innerHTML = '';
      grids.cardGrid.innerHTML = '';
      var folders = await api.getFoldersByParent(currentFolderId);
      var ideas = await api.getIdeasByFolder(currentFolderId);
      await renderFolders(folders);
      await renderCards(ideas);
    }
  }

  function init() {
    var btnNewCard = document.getElementById('btn-new-card');
    if (btnNewCard) {
      btnNewCard.addEventListener('click', function () {
        openNewCard();
      });
    }

    var btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder) {
      btnNewFolder.addEventListener('click', async function () {
        var name = await showModal({
          title: '新建文件夹',
          input: true,
          inputPlaceholder: '输入文件夹名称'
        });
        if (name) {
          await api.createFolder(name, currentFolderId);
          await refresh();
        }
      });
    }

    var searchInput = document.getElementById('ideas-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchKeyword = searchInput.value.trim();
        refresh();
      });
    }

    document.addEventListener('click', function () {
      dismissContextMenu();
    });
  }

  function getScrollElement() {
    return document.getElementById('ideas-content');
  }

  window.IdeasModule = {
    init: init,
    refresh: refresh,
    getScrollElement: getScrollElement
  };
})();
