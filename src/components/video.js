import { youtubeEmbed, isValidHttpUrl, esc, safeHref } from '../lib/util.js';
import { icon } from './icons.js';
export function playerMarkup({ title = '', url = '', live = false } = {}) {
  const yt = youtubeEmbed(url);
  const usable = isValidHttpUrl(url);
  return `<div class="player-frame">${yt ? `<iframe title="${esc(title)}" src="${esc(yt)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>` : usable ? `<video controls playsinline preload="metadata" src="${safeHref(url)}" id="class-video">Your browser cannot play this video.</video>` : `<div class="player-empty"><div class="player-play">${icon('play',32)}</div><strong>${live ? 'Waiting for the live class' : 'Your front-row seat is ready'}</strong><span>${live ? 'The teacher has not added a playable link yet.' : 'Choose a recorded lecture or wait for your next live session.'}</span></div>`}</div>`;
}
