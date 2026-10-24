import { icon } from './icons.js';
import { esc, initials } from '../lib/util.js';
import { mark } from './ui.js';
const learn = [
  ['home', 'Overview', 'home'], ['lectures', 'Video lectures', 'video'],
  ['notes', 'Study material', 'file'], ['tests', 'Practice tests', 'tests'], ['doubts', 'Doubt corner', 'chat']
];
export function renderShell(user, tab, data) {
  const faculty = user.role === 'admin';
  const nav = (entry) => {
    const [id, title, glyph] = entry;
    const count = id === 'lectures' ? data.lectures.length : id === 'notes' ? data.notes.length : id === 'doubts' ? data.doubts.length : id === 'tests' ? Number(data.test.questions.length > 0) : null;
    return `<button class="side-link ${tab === id ? 'is-active' : ''}" type="button" data-nav="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon(glyph,19)}<span>${title}</span>${count !== null ? `<span class="side-count">${count}</span>` : ''}</button>`;
  };
  return `<div class="app-layout">
    <aside class="sidebar">
      <div>
        <div class="brand-lockup">${mark()}<div><strong>Punit Classes</strong><small>LEARN • GROW • SUCCEED</small></div></div>
        <div class="sidebar-label">WORKSPACE</div>
        <nav class="side-nav" aria-label="Main navigation">${learn.map(nav).join('')}</nav>
        ${faculty ? `<div class="sidebar-label admin-heading">FACULTY</div><nav class="side-nav">${nav(['admin','Control center','sliders'])}</nav>` : ''}
      </div>
      <div class="sidebar-foot">
        <div class="sidebar-help"><div class="help-graphic">${icon('graduation', 24)}</div><strong>Learning never stops</strong><p>Everything you need for a productive class day.</p></div>
        <div class="side-profile"><div class="avatar">${esc(initials(user.name))}</div><div class="side-profile-name"><strong>${esc(user.name)}</strong><small>${faculty ? 'Faculty' : 'Student'}</small></div><button class="icon-button" data-action="logout" title="Sign out" aria-label="Sign out">${icon('logout', 18)}</button></div>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="mobile-brand">${mark()}<strong>Punit Classes</strong></div>
        <div class="topbar-left"><span class="breadcrumb">My classroom</span>${icon('chevron', 14)}<span id="current-page-crumb">${tab === 'admin' ? 'Control center' : learn.find(x => x[0] === tab)?.[1] || 'Overview'}</span></div>
        <div class="topbar-right"><label class="search-box">${icon('search', 17)}<input id="global-search" aria-label="Search lectures and resources" placeholder="Search your classroom..." autocomplete="off" /><span class="search-shortcut">⌕</span></label><span class="preview-flag" title="Connected to your classroom backend">${icon('lock', 13)} SECURE CLASSROOM</span><div class="top-avatar" title="${esc(user.name)}">${esc(initials(user.name))}</div><button class="mobile-logout" data-action="logout" title="Sign out" aria-label="Sign out">${icon('logout', 17)}</button></div>
      </header>
      <main class="main-content" id="page-content" tabindex="-1"></main>
    </div>
    <nav class="bottom-nav" aria-label="Mobile navigation">${learn.map(([id, title, glyph]) => `<button data-nav="${id}" class="bottom-link ${tab === id ? 'is-active' : ''}" aria-label="${title}">${icon(glyph,20)}<span>${id === 'home' ? 'Home' : id === 'lectures' ? 'Videos' : id === 'notes' ? 'Notes' : id === 'tests' ? 'Tests' : 'Doubts'}</span></button>`).join('')}${faculty ? `<button class="bottom-link ${tab === 'admin' ? 'is-active' : ''}" data-nav="admin">${icon('sliders', 20)}<span>Admin</span></button>` : ''}</nav>
  </div>`;
}
export function updateNavigation(tab, data) {
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.nav === tab);
    if (button.dataset.nav === tab) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  const crumb = document.getElementById('current-page-crumb');
  if (crumb) crumb.textContent = tab === 'admin' ? 'Control center' : learn.find(x => x[0] === tab)?.[1] || 'Overview';
  for (const id of ['lectures','notes','tests','doubts']) {
    const count = id === 'lectures' ? data.lectures.length : id === 'notes' ? data.notes.length : id === 'doubts' ? data.doubts.length : Number(data.test.questions.length > 0);
    const btn = document.querySelector(`.side-link[data-nav="${id}"] .side-count`);
    if (btn) btn.textContent = count;
  }
}
