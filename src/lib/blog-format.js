export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validSlug = value => typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const makeSlug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
export function safeImage(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
// Deliberately small text format: no raw HTML, embedded scripts, or image markup.
function inline(text) {
  return text.split(/(\[[^\]\n]+\]\([^\s)]+\))/g).map(part => {
    const match = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (match) {
      try { const url = new URL(match[2]); if (['https:','http:','mailto:'].includes(url.protocol)) return `<a href="${escapeHTML(url.href)}" rel="noopener noreferrer">${escapeHTML(match[1])}</a>`; } catch {}
    }
    return escapeHTML(part).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  }).join('');
}
export function renderBody(text) {
  const lines = String(text || '').replace(/\r\n?/g,'\n').split('\n');
  let html = '', paragraph = [], list = [];
  const flush = () => { if(paragraph.length){html += `<p>${paragraph.map(inline).join('<br>')}</p>`;paragraph=[];} if(list.length){html += `<ul>${list.map(line=>`<li>${inline(line)}</li>`).join('')}</ul>`;list=[];} };
  for (const line of lines) {
    const heading = line.match(/^(#{2,3})\s+(.+)$/), item = line.match(/^-\s+(.+)$/);
    if(!line.trim()){flush();continue;}
    if(heading){flush();html+=`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;}
    else if(item){if(paragraph.length)flush();list.push(item[1]);}
    else {if(list.length)flush();paragraph.push(line);}
  }
  flush();return html;
}
const date = value => new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'America/New_York'}).format(new Date(value));
const image = (post,cls='') => safeImage(post.cover_url) ? `<img class="${cls}" src="${escapeHTML(safeImage(post.cover_url))}" alt="${escapeHTML(post.cover_alt)}" width="1200" height="800" loading="lazy" decoding="async">` : '';
export function renderPost(post,preview=false) {
  return `<article class="blog-article">${preview?'':'<a class="blog-back" href="/blog">All posts</a>'}<header><p class="blog-meta">${post.published_at?`<time datetime="${escapeHTML(post.published_at)}">${date(post.published_at)}</time> · `:''}Zachary Routsong${preview?' · Preview':''}</p><h1>${escapeHTML(post.title)}</h1>${post.excerpt?`<p class="blog-deck">${escapeHTML(post.excerpt)}</p>`:''}</header>${image(post,'blog-cover')}<div class="blog-prose">${renderBody(post.body)}</div>${preview?'':'<footer class="blog-end"><a href="/book">Book a session</a><a href="/blog">All posts</a></footer>'}</article>`;
}
export function renderIndex(posts,page=1,hasMore=false) {
  return `<header class="blog-heading"><h1>Blog</h1></header>${posts.length?`<div class="blog-list">${posts.map(post=>`<article class="blog-entry${safeImage(post.cover_url)?' has-photo':''}">${safeImage(post.cover_url)?`<a href="/blog/${escapeHTML(post.slug)}" tabindex="-1" aria-hidden="true">${image(post)}</a>`:''}<div><p class="blog-meta"><time datetime="${escapeHTML(post.published_at)}">${date(post.published_at)}</time></p><h2><a href="/blog/${escapeHTML(post.slug)}">${escapeHTML(post.title)}</a></h2>${post.excerpt?`<p>${escapeHTML(post.excerpt)}</p>`:''}<a class="blog-read" href="/blog/${escapeHTML(post.slug)}">Read post<span class="sr-only">: ${escapeHTML(post.title)}</span></a></div></article>`).join('')}</div>`:'<p class="no-data">No posts yet.</p>'}${page>1||hasMore?`<nav class="blog-pagination" aria-label="Blog pages">${page>1?`<a href="/blog?page=${page-1}">Newer posts</a>`:''}${hasMore?`<a href="/blog?page=${page+1}">Older posts</a>`:''}</nav>`:''}`;
}
