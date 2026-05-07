(function () {
  const api = window.nabnote;

  let todoScrollTop = 0;
  let ideasScrollTop = 0;

  document.addEventListener('DOMContentLoaded', async function () {
    const themeResult = await api.getConfig('theme');
    const theme = themeResult.value || 'dark';
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';

    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', async function () {
        const isDark = document.body.classList.contains('theme-dark');
        const newTheme = isDark ? 'light' : 'dark';
        document.body.className = newTheme === 'light' ? 'theme-light' : 'theme-dark';
        await api.setConfig('theme', newTheme);
      });
    }

    const tabTodo = document.getElementById('tab-todo');
    const tabIdeas = document.getElementById('tab-ideas');
    const panelTodo = document.getElementById('panel-todo');
    const panelIdeas = document.getElementById('panel-ideas');

    if (tabTodo && tabIdeas && panelTodo && panelIdeas) {
      tabTodo.addEventListener('click', function () {
        if (IdeasModule.getScrollElement()) {
          ideasScrollTop = IdeasModule.getScrollElement().scrollTop;
        }
        tabTodo.classList.add('active');
        tabIdeas.classList.remove('active');
        panelTodo.classList.add('active');
        panelIdeas.classList.remove('active');
        if (TodoModule.getScrollElement()) {
          TodoModule.getScrollElement().scrollTop = todoScrollTop;
        }
      });

      tabIdeas.addEventListener('click', function () {
        if (TodoModule.getScrollElement()) {
          todoScrollTop = TodoModule.getScrollElement().scrollTop;
        }
        tabIdeas.classList.add('active');
        tabTodo.classList.remove('active');
        panelIdeas.classList.add('active');
        panelTodo.classList.remove('active');
        if (IdeasModule.getScrollElement()) {
          IdeasModule.getScrollElement().scrollTop = ideasScrollTop;
        }
      });
    }

    const btnMinimize = document.getElementById('btn-minimize');
    if (btnMinimize) {
      btnMinimize.addEventListener('click', function () {
        api.minimizeWindow();
      });
    }

    const btnClose = document.getElementById('btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', function () {
        api.closeWindow();
      });
    }

    TodoModule.init();
    IdeasModule.init();

    await TodoModule.refresh();
    await IdeasModule.refresh();

    const noteInput = document.getElementById('note-input');
    if (noteInput) noteInput.focus();
  });
})();
