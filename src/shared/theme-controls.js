// Shared by both sites. Inlined at the end of <body>: wires the appearance
// switch and the small-screen Menu button, and passes the current appearance
// choice along on links to the other site.
(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const picker = document.getElementById('theme-picker');
  const choices = picker?.querySelectorAll('input[name="theme"]') || [];
  const syncTheme = () => {
    const preference = root.dataset.themePreference;
    const label = `Appearance: ${preference[0].toUpperCase()}${preference.slice(1)}`;
    toggle?.setAttribute('aria-label', label);
    toggle?.setAttribute('title', label);
    choices.forEach(choice => { choice.checked = choice.value === preference; });
    document.querySelectorAll('a[data-other-site]').forEach(link => {
      try { const url = new URL(link.href); url.searchParams.set('appearance', preference); link.href = url.href; } catch (_) {}
    });
  };
  syncTheme();
  window.addEventListener('zrp-theme-change', syncTheme);
  choices.forEach(choice => choice.addEventListener('change', () => window.zrpTheme.set(choice.value)));
  document.addEventListener('click', event => {
    if (picker?.open && !picker.contains(event.target)) picker.open = false;
  });
  picker?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { picker.open = false; toggle.focus(); event.preventDefault(); }
  });
  picker?.addEventListener('focusout', event => {
    if (!picker.contains(event.relatedTarget)) picker.open = false;
  });
  const menu = document.querySelector('.nav-menu');
  document.addEventListener('click', event => { if (menu?.open && !menu.contains(event.target)) menu.open = false; });
  menu?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); event.preventDefault(); }
  });
})();
