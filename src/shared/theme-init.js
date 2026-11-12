// Shared by zrphotos.net and photos.zrphotos.net. Inlined in <head> by both
// layouts so the right theme is applied before the page paints.
// Browser storage is per-site, so links between the two sites carry the choice
// as ?appearance=light|dark|system; it is saved here and removed from the URL.
(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => value === 'light' || value === 'dark' ? value : 'system';
  let preference = 'system';
  try { preference = normalize(localStorage.getItem('zrp-theme')); } catch (_) {}
  try {
    const url = new URL(location.href), carried = url.searchParams.get('appearance');
    if (carried !== null) {
      preference = normalize(carried);
      try { localStorage.setItem('zrp-theme', preference); } catch (_) {}
      url.searchParams.delete('appearance');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  } catch (_) {}
  const apply = () => {
    const dark = preference === 'dark' || (preference === 'system' && system.matches);
    root.classList.toggle('dark', dark);
    root.dataset.themePreference = preference;
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#202020' : '#f8f8f8';
    window.dispatchEvent(new Event('zrp-theme-change'));
  };
  window.zrpTheme = {
    set(value) {
      preference = normalize(value);
      try { localStorage.setItem('zrp-theme', preference); } catch (_) {}
      apply();
    }
  };
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === 'zrp-theme' || event.key === null) {
      try { preference = normalize(localStorage.getItem('zrp-theme')); } catch (_) {}
      apply();
    }
  });
  apply();
})();
