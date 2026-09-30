// Shared by the homepage "Selected work" grid and the /portfolio page.
//
// Tiles are real <button>s, so every photo can be reached by keyboard and
// touch. Text is set with textContent (never innerHTML), and the lightbox
// takes focus when it opens and hands it back when it closes.

// There are no written descriptions per photo yet, so describe what we know.
export function photoAlt(p) {
  const what = p.title || p.sport || 'Photograph';
  return p.location ? `${what}, ${p.location}` : what;
}

// `eagerCount`: how many tiles are on screen at load. Those are fetched right
// away (the first with high priority); everything further down loads lazily.
export function makeTile(p, index, eagerCount = 0) {
  const alt = photoAlt(p);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'grid-item';
  btn.setAttribute('aria-label', 'Open photo: ' + alt);

  const img = document.createElement('img');
  // Order matters: loading/sizes/srcset before src, or the browser may start
  // fetching the full image before it knows it should wait.
  img.loading = index < eagerCount ? 'eager' : 'lazy';
  if (index === 0 && eagerCount > 0) img.setAttribute('fetchpriority', 'high');
  img.decoding = 'async';
  if (p.thumb_url && p.web_url) {
    img.sizes = '(max-width:600px) 100vw, (max-width:1060px) 50vw, 340px';
    img.srcset = `${p.thumb_url} 700w, ${p.web_url} 2200w`;
  }
  if (p.width && p.height) { img.width = p.width; img.height = p.height; }  // reserves space, no layout jump
  img.alt = alt;
  img.src = p.thumb_url || p.web_url || p.url;
  btn.appendChild(img);

  const caption = p.title || p.sport || '';
  if (caption || p.location) {
    const overlay = document.createElement('span');
    overlay.className = 'grid-overlay';
    overlay.setAttribute('aria-hidden', 'true');          // already in the button's label
    const text = document.createElement('span');
    text.textContent = caption;
    if (p.location) {
      const loc = document.createElement('span');
      loc.className = 'grid-loc';
      loc.textContent = p.location;
      text.appendChild(loc);
    }
    overlay.appendChild(text);
    btn.appendChild(overlay);
  }

  btn.addEventListener('click', () => openLightbox(p.web_url || p.url, alt, btn));
  return btn;
}

let lastTrigger = null;

export function openLightbox(url, alt, trigger) {
  const lb = document.getElementById('lb');
  const img = document.getElementById('lb-img');
  img.alt = alt || '';
  img.src = url;
  lastTrigger = trigger || document.activeElement;
  lb.classList.add('open');
  lb.querySelector('.lb-close').focus();
}

export function closeLightbox() {
  const lb = document.getElementById('lb');
  if (!lb.classList.contains('open')) return;
  lb.classList.remove('open');
  if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
}

// Click anywhere or press Escape to close. The close button is the only
// control inside, so Tab stays on it instead of wandering behind the overlay.
export function bindLightbox() {
  const lb = document.getElementById('lb');
  lb.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'Tab') { e.preventDefault(); lb.querySelector('.lb-close').focus(); }
  });
}
