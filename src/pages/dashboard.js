import { icon } from '../components/icons.js';
import { esc, safeHref } from '../lib/util.js';
import { sectionTitle, pill, emptyState } from '../components/ui.js';
import { messagesList } from '../components/chat.js';
import { playerMarkup } from '../components/video.js';
export function dashboard(data, user, ui) {
  const live = data.liveStream.isLive;
  const active = ui.activeVideo || (live ? { title: data.liveStream.title, url: data.liveStream.youtubeUrl, live: true } : null);
  return `<div class="dashboard-page">
    <div class="greeting-line"><span>${icon('spark',15)} YOUR LEARNING SPACE</span><span>${icon('calendar',15)} ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</span></div>
    <section class="hero"><div class="hero-copy"><span class="hero-kicker">HELLO, ${esc(user.name.split(' ')[0].toUpperCase())} 👋</span><h1>Make today a <em>great</em><br>day to learn.</h1><p>Pick up where you left off, explore a topic, or get your doubts cleared. Everything starts here.</p><button data-nav="lectures" class="button button-white">Explore lessons ${icon('arrow',18)}</button></div>
      <div class="hero-illustration" aria-hidden="true"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><div class="illustration-card base-card"><div class="mini-circle">${icon('book',25)}</div><div class="illus-lines"><span></span><span></span><span></span></div></div><div class="illus-floating top">${icon('spark',19)}<span>Keep growing!</span></div><div class="illus-floating lower">${icon('check',19)}<span>You've got this</span></div><div class="hero-sparkle">✦</div></div>
    </section>
    ${live ? `<div class="live-class-banner"><span class="live-class-pulse"></span><div><strong>You're invited to a live class</strong><small>${esc(data.liveStream.title)}</small></div><button data-action="join-live" class="button button-white">Join live class ${icon('arrow',16)}</button></div>` : ''}
    <section class="stats-grid" aria-label="Classroom overview">
      ${stat('lectures', 'video', 'Video lessons', data.lectures.length, 'Browse recordings', 'stat-purple')}
      ${stat('notes', 'file', 'Study resources', data.notes.length, 'Notes & practice', 'stat-orange')}
      ${stat('tests', 'tests', 'Practice tests', Number(Boolean(data.test.questions.length)), 'Check your knowledge', 'stat-mint')}
      ${stat('doubts', 'chat', 'Doubt messages', data.doubts.length, 'Get your answers', 'stat-blue')}
    </section>
    <div class="section-title-area">${sectionTitle('Your virtual classroom', 'Watch, participate, and stay connected.', live ? pill('● LIVE RIGHT NOW', 'red') : pill('● CLASSROOM READY', 'green'))}</div>
    <div class="dashboard-columns">
      <section class="surface main-player-card"><div class="panel-heading"><div><span class="eyebrow">${live ? 'LIVE CLASS IN PROGRESS' : 'CLASSROOM PLAYER'}</span><h3>${esc(active?.title || 'A place to learn, together')}</h3></div>${live ? pill('LIVE', 'red') : `<span class="secondary-label">${icon('video',15)} Video</span>`}</div>
        ${playerMarkup(active || {})}
        <div class="player-footer"><span>${icon('activity', 16)} ${active?.live ? 'Live via external stream' : active ? 'Recorded lecture' : 'Ready when you are'}</span>${active?.url ? `<a class="quiet-link" target="_blank" rel="noopener noreferrer" href="${safeHref(active.url)}">Open source ${icon('external',15)}</a>` : `<button class="quiet-link" data-nav="lectures">Browse lectures ${icon('arrow',15)}</button>`}</div>
      </section>
      <section class="surface chat-panel"><div class="panel-heading"><div><span class="eyebrow">CLASSROOM COMMUNITY</span><h3>Live class chat</h3></div><span class="chat-online">${icon('chat',16)}</span></div><div class="chat-messages" id="live-chat-list">${messagesList(data.liveChat, 'It’s quiet here', 'Ask a question or say hello to your class.')}</div><form id="live-chat-form" class="chat-compose"><input name="message" maxlength="1200" required autocomplete="off" aria-label="Message to classroom" placeholder="Write a message..." /><button aria-label="Send message" type="submit" class="button button-primary send-button">${icon('arrow',18)}</button></form></section>
    </div>
    <div class="dashboard-columns lower-columns">
      <section class="surface recent-panel">${sectionTitle('Fresh from your class', 'Recently added lessons and notes.', `<button class="quiet-link" data-nav="lectures">See all ${icon('arrow',15)}</button>`)}<div class="recent-list">${recent(data)}</div></section>
      <section class="surface next-panel"><span class="next-icon">${icon('target',25)}</span><h3>Practice makes progress.</h3><p>Ready to check what you know? Take the latest class quiz and see how you’re doing.</p><button class="button button-dark" data-nav="tests">Go to practice tests ${icon('arrow',17)}</button><div class="next-decoration">✳</div></section>
    </div>
  </div>`;
}
function stat(nav, glyph, label, value, detail, tone) {
  return `<button type="button" data-nav="${nav}" class="stat-card"><div class="stat-icon ${tone}">${icon(glyph,22)}</div><div><span class="stat-label">${label}</span><div class="stat-count">${value.toLocaleString('en-IN')}</div><span class="stat-detail">${detail} ${icon('arrow',14)}</span></div></button>`;
}
function recent(data) {
  const items = [...data.lectures.map(i => ({ ...i, kind: 'video' })), ...data.notes.map(i => ({ ...i, kind: 'file' }))].slice(0, 4);
  if (!items.length) return emptyState({ image:'book', title: 'Your library is growing', detail: 'When your teacher adds resources, they will appear here.' });
  return items.map(i => `<button data-nav="${i.kind === 'video' ? 'lectures' : 'notes'}" class="recent-item"><span class="recent-icon ${i.kind === 'video' ? 'stat-purple' : 'stat-orange'}">${icon(i.kind,19)}</span><span class="recent-text"><strong>${esc(i.title)}</strong><small>${esc(i.chapter || 'General')}</small></span>${icon('chevron',17)}</button>`).join('');
}
