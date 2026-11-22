const root = document.documentElement;
const theme = document.querySelector('#theme');

function setTheme(dark) {
  root.dataset.theme = dark ? 'dark' : 'light';
  theme.textContent = dark ? '☀' : '☾';
  theme.setAttribute('aria-pressed', String(dark));
}

let savedTheme;
try { savedTheme = localStorage.getItem('iuvc-theme'); } catch {}
setTheme(savedTheme ? savedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
theme.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  setTheme(dark);
  try { localStorage.setItem('iuvc-theme', root.dataset.theme); } catch {}
});

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function inline(text) {
  const tokens = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|`[^`]+`|\[((?:[^\[\]]|\[[^\]]*\])+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|~~([^~]+)~~)/g;
  let html = '';
  let start = 0;
  for (const match of text.matchAll(tokens)) {
    html += escapeHtml(text.slice(start, match.index));
    const [value, , label, url, bold, struck] = match;
    if (url) html += '<a href="' + escapeHtml(url) + '">' + escapeHtml(label) + '</a>';
    else if (bold) html += '<strong>' + inline(bold) + '</strong>';
    else if (struck) html += '<del>' + inline(struck) + '</del>';
    else if (value.startsWith('`')) html += '<code>' + escapeHtml(value.slice(1, -1)) + '</code>';
    else html += escapeHtml(value);
    start = match.index + value.length;
  }
  return html + escapeHtml(text.slice(start));
}

function blocks(text) {
  return text.trim().split(/\n\s*\n/).filter(Boolean).map(block => {
    if (block.startsWith('$$')) return '<div>' + escapeHtml(block) + '</div>';
    if (block.startsWith('- ')) {
      return '<ul>' + block.split('\n').map(item => '<li>' + inline(item.slice(2)) + '</li>').join('') + '</ul>';
    }
    return '<p>' + inline(block) + '</p>';
  }).join('');
}

async function showArticle() {
  document.title = 'の | iuvC 的博客';
  document.querySelector('#home').hidden = true;
  document.querySelector('#reader').hidden = false;
  document.querySelector('#home-link').removeAttribute('aria-current');
  const notes = document.querySelector('#notes-link');
  notes.href = './#notes';
  notes.setAttribute('aria-current', 'page');

  const body = document.querySelector('#article-body');
  try {
    const response = await fetch('journal.md');
    if (!response.ok) throw Error('Markdown unavailable');
    const md = (await response.text()).replace(/\r\n/g, '\n');
    const token = /^:::(info|success)\[(.*)\](\{open\})?\n([\s\S]*?)^:::[ \t]*$|^## (.+)$/gm;
    let html = '';
    let cursor = 0;
    for (const part of md.matchAll(token)) {
      html += blocks(md.slice(cursor, part.index));
      const [match, kind, title, isOpen, contents, heading] = part;
      if (heading) {
        const id = 'day-' + heading.replace(/\W/g, '-');
        html += '<h2 id="' + id + '">' + escapeHtml(heading) + '</h2>';
        const link = document.createElement('a');
        link.href = '#' + id;
        link.textContent = heading;
        document.querySelector('#toc-links').append(link);
      } else {
        const type = kind === 'success' ? 'solution' : 'problem';
        html += '<details class="' + type + '"' + (isOpen ? ' open' : '') + '><summary>' + inline(title) + '</summary><div>' + blocks(contents) + '</div></details>';
      }
      cursor = part.index + match.length;
    }
    body.innerHTML = html + blocks(md.slice(cursor));
    window.renderMathInElement?.(body, {
      delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],
      throwOnError: false
    });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch {
    body.innerHTML = '<p role="status">文章暂时加载失败。<a href="https://www.luogu.com.cn/article/k89c1gej">打开洛谷原文</a></p>';
  }
}

if (new URLSearchParams(location.search).get('post') === 'no') showArticle();
