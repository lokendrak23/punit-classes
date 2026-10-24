import { icon } from '../components/icons.js';
import { mark } from '../components/ui.js';
export function renderLogin(mode='login') {
  const registering = mode === 'register';
  return `<div class="login-layout">
    <section class="login-story"><div class="story-noise"></div>
      <div class="login-story-top">${mark()}<span>Punit Classes</span></div>
      <div class="story-content"><span class="story-eyebrow">A BETTER WAY TO LEARN</span><h1>Big dreams start with <em>small steps.</em></h1><p>Your learning space for live classes, recordings, practice questions, and doubts—shared across all your devices.</p><div class="story-chips"><span>${icon('video',17)} Live learning</span><span>${icon('book',17)} Smart practice</span><span>${icon('chat',17)} Doubt support</span></div></div>
      <div class="story-foot">YOUR CLASSROOM, REIMAGINED <span>✦</span></div><div class="story-decor story-decor-a"></div><div class="story-decor story-decor-b"></div>
    </section>
    <section class="login-form-side"><div class="login-card">
      <div class="login-mobile-logo">${mark()}<strong>Punit Classes</strong></div>
      <div class="tiny-overline">WELCOME TO PUNIT CLASSES</div><h2>${registering?'Join your classroom':'Welcome back'}</h2><p class="login-subhead">${registering?'Create a student account with your batch code.':'Sign in securely with your classroom account.'}</p>
      <form id="login-form" autocomplete="on">
        ${registering?'<div class="field"><label for="login-name">Full name</label><input id="login-name" name="name" required maxlength="80" placeholder="Your full name" autocomplete="name" /></div>':''}
        <div class="field"><label for="login-email">Email address</label><input id="login-email" name="email" required type="email" maxlength="254" placeholder="student@example.com" autocomplete="email" /></div>
        <div class="field"><label for="login-password">Password</label><input id="login-password" name="password" required type="password" minlength="${registering?12:1}" autocomplete="${registering?'new-password':'current-password'}" placeholder="${registering?'At least 12 characters':'Your password'}" /></div>
        ${registering?'<div class="field"><label for="login-code">Batch access code</label><input id="login-code" name="batchCode" required maxlength="80" placeholder="Code provided by Punit Sir" /></div>':''}
        <p class="form-error" id="login-error" role="alert" hidden></p>
        <button type="submit" class="button button-primary login-submit">${registering?'Create account':'Sign in'} ${icon('arrow',18)}</button>
      </form>
      <div class="login-notice">${icon('lock',17)} Faculty access is assigned securely on the server. Students cannot select the admin role.</div>
      <p class="login-after">${registering?'Already enrolled?':'New student?'} <button type="button" data-action="auth-mode" data-mode="${registering?'login':'register'}" class="quiet-link">${registering?'Sign in':'Create an account'}</button></p>
    </div><div class="login-copyright">© ${new Date().getFullYear()} Punit Classes · Made for curious minds.</div></section>
  </div>`;
}
