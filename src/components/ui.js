import { icon } from './icons.js';
import { esc } from '../lib/util.js';
export const pill = (text, tone = 'blue') => `<span class="pill pill-${tone}">${esc(text)}</span>`;
export function emptyState({ image = 'book', title, detail, action = '' }) {
  return `<div class="empty"><span class="empty-icon">${icon(image, 27)}</span><h3>${esc(title)}</h3><p>${esc(detail)}</p>${action}</div>`;
}
export function pageHead({ eyebrow, title, detail, button = '' }) {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow ? esc(eyebrow) : 'YOUR CLASSROOM'}</div><h1>${esc(title)}</h1><p>${esc(detail)}</p></div>${button}</div>`;
}
export const mark = () => `<div class="brand-mark"><span>p</span><span class="brand-dot"></span></div>`;
export const sectionTitle = (title, caption = '', action = '') => `<div class="section-title"><div><h2>${esc(title)}</h2>${caption ? `<p>${esc(caption)}</p>` : ''}</div>${action}</div>`;
