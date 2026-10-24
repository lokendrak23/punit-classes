import { icon } from '../components/icons.js';
import { esc } from '../lib/util.js';
import { pageHead, pill, emptyState } from '../components/ui.js';
export function testsPage(data, ui, admin) {
  const questions = data.test.questions || [];
  return `${pageHead({ eyebrow: 'PRACTICE & IMPROVE', title: 'Practice tests', detail: 'Put your understanding to the test. Every attempt is a step forward.', button: admin ? `<button class="button button-primary" data-nav="admin">${icon('plus',16)} Edit questions</button>` : '' })}
  <div class="test-layout"><div class="surface test-surface"><div class="test-heading"><div><span class="eyebrow">CLASS PRACTICE</span><h2>${esc(data.test.title || 'Your next practice session')}</h2></div>${questions.length ? pill(`${questions.length} QUESTIONS`, 'purple') : ''}</div>
    ${questions.length ? `${renderQuiz(questions, ui, admin)}` : emptyState({ image:'tests', title:'No active quiz right now', detail:'Once your teacher creates a quiz, you can take it right here.' })}
  </div><aside class="test-side"><div class="surface score-guide"><div class="score-guide-icon">${icon('target',22)}</div><h3>Every answer counts</h3><p>Scoring follows the class system. Unanswered questions receive zero points.</p><div class="score-row"><span>Correct answer</span><strong class="positive">+4 points</strong></div><div class="score-row"><span>Incorrect answer</span><strong class="negative">−1 point</strong></div><div class="score-row"><span>Not attempted</span><strong>0 points</strong></div></div>
    <div class="surface leaderboard"><div class="section-heading-small"><span class="trophy-icon">${icon('trophy',19)}</span><h3>Class leaderboard</h3></div>${renderLeaderboard(data.leaderboard)}${admin ? `<button class="quiet-link danger-text" data-action="clear-leaderboard">${icon('trash',14)} Clear leaderboard</button>` : ''}</div></aside></div>`;
}
function renderQuiz(questions, ui, admin) {
  const answered = Object.keys(ui.answers).length;
  return `<div class="quiz-progress-header"><span>${ui.testSubmitted ? 'Quiz submitted' : `${answered} of ${questions.length} answered`}</span><span>${Math.round((answered / questions.length) * 100)}%</span></div><div class="quiz-progress"><span style="width:${Math.round(answered/questions.length*100)}%"></span></div>
    <div class="question-list">${questions.map((q, i) => `<section class="question-block"><div class="question-number">QUESTION ${String(i+1).padStart(2,'0')}${admin ? `<button class="quiet-link danger-text" data-action="delete-question" data-index="${i}">${icon('trash',14)} Remove</button>` : ''}</div><h3>${esc(q.q)}</h3><div class="options-grid">${q.options.map((opt, j) => {
      const chosen = ui.answers[i] === j;
      const right = ui.testSubmitted && j === Number(ui.reviewCorrect?.[i] ?? q.correct);
      const wrong = ui.testSubmitted && chosen && !right;
      return `<button type="button" ${ui.testSubmitted ? 'disabled' : ''} data-action="answer" data-index="${i}" data-option="${j}" class="answer-option ${chosen ? 'is-chosen' : ''} ${right ? 'is-right' : ''} ${wrong ? 'is-wrong' : ''}"><span class="option-letter">${'ABCD'[j]}</span><span>${esc(opt)}</span>${right ? icon('check',17) : ''}</button>`;
    }).join('')}</div></section>`).join('')}</div>
    ${ui.testSubmitted ? `<div class="result-card">${icon('trophy',29)}<div><strong>Practice complete! You scored ${ui.quizScore ?? '—'} / ${questions.length * 4}</strong><p>Keep practicing to build confidence. Your first attempt counts toward the leaderboard.</p></div></div>` : ''}
    <div class="test-actions">${ui.testSubmitted ? `<span class="quiet-link">${icon('check',16)} Submission recorded · first attempt counts</span>` : `<button class="button button-primary" data-action="submit-test">${icon('check',17)} Submit my answers</button>`}</div>`;
}
export function scoreTest(qs, answers) { return qs.reduce((sum, q, i) => answers[i] === undefined ? sum : sum + (Number(q.correct) === answers[i] ? 4 : -1), 0); }
function renderLeaderboard(list) {
  if (!list.length) return `<div class="ranking-empty">${icon('trophy',25)}<p>No scores yet. Be the first to complete a test!</p></div>`;
  return `<div class="ranking-list">${[...list].sort((a,b) => b.score - a.score).slice(0,10).map((x,i) => `<div class="rank-row"><span class="rank-index ${i === 0 ? 'first-rank' : ''}">${i+1}</span><span class="rank-name"><strong>${esc(x.name)}</strong><small>${esc(x.time || '')}</small></span><strong>${x.score} <small>pts</small></strong></div>`).join('')}</div>`;
}
