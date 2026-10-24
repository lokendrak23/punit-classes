import { icon } from './icons.js';
import { esc, initials } from '../lib/util.js';
import { emptyState } from './ui.js';
export function messagesList(messages, emptyTitle = 'No messages yet', emptyDetail = 'Start the conversation!') {
  if (!messages.length) return emptyState({ image: 'chat', title: emptyTitle, detail: emptyDetail });
  return messages.map((m, index) => `<div class="message ${m.role === 'admin' ? 'from-teacher' : ''}" data-message-index="${index}">
    <div class="message-avatar">${esc(initials(m.sender))}</div>
    <div class="message-body"><div class="message-meta"><strong>${esc(m.sender)}</strong>${m.role === 'admin' ? '<span class="teacher-marker">FACULTY</span>' : ''}<time>${esc(m.time || '')}</time></div>
      <p>${esc(m.text)}</p>${m.photo && (/^(data:image\/|https:\/\/res\.cloudinary\.com\/)/.test(m.photo)) ? `<img class="message-photo" alt="Attached notebook photo" loading="lazy" src="${esc(m.photo)}"/>` : ''}
      ${m.canDelete ? `<button data-action="delete-doubt" data-id="${esc(m.id)}" class="text-danger small-button">${icon('trash',13)} Remove</button>` : ''}
    </div></div>`).join('');
}
