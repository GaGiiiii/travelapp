// Color themes. Each theme is a block of CSS injected into the #theme-style tag.
// switchTheme() cycles through them and remembers the choice in localStorage.

const themeStyle = document.getElementById('theme-style');

const themes = [
    {
        css: `body { background: #2e3440; color: #d8dee9; }
              .upload-btn { color: #d8dee9; }
              .delete-btn { color: #d8dee9; }
              .delete-btn:hover { color: #81a1c1; }
              .upload-btn:hover { color: #81a1c1; }
              .header-title { color: #81a1c1; text-shadow: 1px 1px 3px #000; }
              .section-title { color: #88c0d0; }
              .card { background-color: #3b4252; border: none; }
              .list-group-item { background-color: #434c5e; color: #d8dee9; }
              .list-group-item:hover { background-color: #4c566a; }
              .btn-primary { background-color: #5e81ac; border: none; }
              .btn-primary:hover { background-color: #81a1c1; }
              .btn-secondary { background-color: #4c566a; color: #fff; border: none; }
              .copy-btn, .download-btn { color: #d8dee9; }
              .copy-btn:hover, .download-btn:hover { color: #81a1c1; }
              #localstorage-info { color: #d8dee9; }
              .sort-label { color: #88c0d0; }
              .sort-select { background-color: #434c5e; color: #d8dee9; border-color: #4c566a; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23d8dee9' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); }
              .list-tab { background-color: #434c5e; color: #d8dee9; }
              .list-tab.active { background-color: #5e81ac; color: #fff; }
              .list-add-btn, .list-manage-btn { background-color: #4c566a; color: #d8dee9; }
              .list-add-btn:hover, .list-manage-btn:hover { background-color: #5e81ac; color: #fff; }
              #copy-popup { background-color: #4c566a; color: #d8dee9; }`
    },
    {
        css: `body { background: #282c34; color: #abb2bf; }
                .upload-btn { color: #abb2bf; }
                .delete-btn { color: #abb2bf; }
                .delete-btn:hover { color: #61afef; }
                .upload-btn:hover { color: #61afef; }
              .header-title { color: #61afef; text-shadow: 1px 1px 3px #000; }
              .section-title { color: #e06c75; }
              .card { background-color: #3a3f4b; border: none; }
              .list-group-item { background-color: #4b5263; color: #abb2bf; }
              .list-group-item:hover { background-color: #5c6370; }
              .btn-primary { background-color: #98c379; border: none; }
              .btn-primary:hover { background-color: #8ac36f; }
              .btn-secondary { background-color: #5c6370; color: #fff; border: none; }
              .copy-btn, .download-btn { color: #abb2bf; }
              .copy-btn:hover, .download-btn:hover { color: #61afef; }
              #localstorage-info { color: #abb2bf; }
              .sort-label { color: #e06c75; }
              .sort-select { background-color: #4b5263; color: #abb2bf; border-color: #5c6370; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23abb2bf' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); }
              .list-tab { background-color: #4b5263; color: #abb2bf; }
              .list-tab.active { background-color: #98c379; color: #282c34; }
              .list-add-btn, .list-manage-btn { background-color: #5c6370; color: #abb2bf; }
              .list-add-btn:hover, .list-manage-btn:hover { background-color: #98c379; color: #282c34; }
              #copy-popup { background-color: #5c6370; color: #abb2bf; }`
    },
    {
        css: `body { background: #fff; color: #222; }
                .upload-btn { color: #0d47a1; }
                .delete-btn { color: #0d47a1; }
                .delete-btn:hover { color: #1976d2; }
                .upload-btn:hover { color: #1976d2; }
              .header-title { color: #0d47a1; text-shadow: 1px 1px 2px #fff; }
              .section-title { color: #1565c0; }
              .list-group-item:hover { background-color: #e0f7fa; }
              .btn-primary { background-color: #1976d2; border: none; }
              .btn-primary:hover { background-color: #004ba0; }
              .copy-btn, .download-btn { color: #0d47a1; }
              .copy-btn:hover, .download-btn:hover { color: #1976d2; }
              #localstorage-info { color: #222; }
              .sort-label { color: #1565c0; }
              .list-tab { background-color: #e9ecef; color: #222; }
              .list-tab.active { background-color: #1976d2; color: #fff; }
              .list-add-btn, .list-manage-btn { background-color: #e0e0e0; color: #222; }
              .list-add-btn:hover, .list-manage-btn:hover { background-color: #1976d2; color: #fff; }
              #copy-popup { background-color: #0d47a1; color: #fff; }`
    },
    {
        css: `body { background: #fffaf0; color: #4d2e1f; }
                .upload-btn { color: #6b4226; }
                .delete-btn { color: #6b4226; }
                .delete-btn:hover { color: #8b5e3c; }
                .upload-btn:hover { color: #8b5e3c; }
              .header-title { color: #6b4226; text-shadow: 1px 1px 2px #fff0e0; }
              .section-title { color: #8b5e3c; }
              .card { background-color: #fdf6ec; border: none; }
              .list-group-item { background-color: #fbead1; color: #4d2e1f; }
              .list-group-item:hover { background-color: #f2dcc2; }
              .btn-primary { background-color: #d9a066; border: none; }
              .btn-primary:hover { background-color: #c6894f; }
              .btn-secondary { background-color: #b08968; color: #fff; border: none; }
              .copy-btn, .download-btn { color: #6b4226; }
              .copy-btn:hover, .download-btn:hover { color: #8b5e3c; }
              #localstorage-info { color: #4d2e1f; }
              .sort-label { color: #8b5e3c; }
              .sort-select { background-color: #fbead1; color: #4d2e1f; border-color: #d9a066; }
              .list-tab { background-color: #fbead1; color: #4d2e1f; }
              .list-tab.active { background-color: #8b5e3c; color: #fff; }
              .list-add-btn, .list-manage-btn { background-color: #b08968; color: #fff; }
              .list-add-btn:hover, .list-manage-btn:hover { background-color: #8b5e3c; color: #fff; }
              #copy-popup { background-color: #b08968; color: #fff; }`
    }
];

function switchTheme(init = false) {
    let currentTheme = localStorage.getItem('currentTheme') || 0;

    if (!init) {
        currentTheme = Number(currentTheme) + 1;
    }

    if (currentTheme >= themes.length) {
        currentTheme = 0;
    }

    themeStyle.innerHTML = themes[currentTheme].css;
    localStorage.setItem('currentTheme', currentTheme);
}

switchTheme(true);
