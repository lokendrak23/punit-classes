import { store } from './lib/store.js';
import { api, signedUpload, dataUrlFile } from './lib/api.js';
import { esc, compressPhoto } from './lib/util.js';
import { renderLogin } from './pages/login.js';
import { renderShell, updateNavigation } from './components/layout.js';
import { dashboard } from './pages/dashboard.js';
import { lecturesPage } from './pages/lectures.js';
import { materialsPage } from './pages/materials.js';
import { testsPage } from './pages/tests.js';
import { doubtsPage } from './pages/doubts.js';
import { adminPage } from './pages/admin.js';
import { messagesList } from './components/chat.js';

const root=document.getElementById('app');
const ui={tab:'home',search:'',notesFilter:'all',activeVideo:null,answers:{},testSubmitted:false,quizScore:null,reviewCorrect:null,photo:null,uploadMode:'link',uploadsEnabled:false,mode:'login',importDraft:null,importTitle:''};
let pageInitialized=false, loading=false, toastTimer, currentVersion=null;
function toast(message,error=false) {
  const holder=document.getElementById('toast-region');
  holder.innerHTML=`<div class="toast ${error?'toast-error':''}" role="status">${esc(message)}</div>`;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>holder.replaceChildren(),4200);
}
function loginError(msg){const field=document.getElementById('login-error');if(field){field.hidden=false;field.textContent=msg;}else toast(msg,true);}
function showLogin(){pageInitialized=false;root.innerHTML=renderLogin(ui.mode);}
function showEnrollment(){pageInitialized=false;root.innerHTML=`<section class="login-form-side" style="min-height:100vh"><div class="login-card"><div class="tiny-overline">ONE MORE STEP</div><h2>Join Punit Classes</h2><p class="login-subhead">Your Appwrite account exists, but you need a valid batch code to enter this classroom.</p><form id="join-form"><div class="field"><label for="join-code">Batch code</label><input id="join-code" required name="code" maxlength="80" /></div><button class="button button-primary login-submit" type="submit">Join classroom</button></form><p class="login-after"><button data-action="logout" class="quiet-link">Sign out</button></p></div></section>`;}
function mountApp(){if(!store.user())return showLogin();if(store.user().role==='unenrolled')return showEnrollment();pageInitialized=true;root.innerHTML=renderShell(store.user(),ui.tab,store.get());renderPage();}
function renderPage(){
  if(!store.user() || !pageInitialized)return;
  if(ui.tab==='admin'&&!store.isAdmin())ui.tab='home';
  const host=document.getElementById('page-content');if(!host)return;
  const data=store.get(), user=store.user();
  const pages={home:()=>dashboard(data,user,ui),lectures:()=>lecturesPage(data,ui,store.isAdmin()),notes:()=>materialsPage(data,ui,store.isAdmin()),tests:()=>testsPage(data,ui,store.isAdmin()),doubts:()=>doubtsPage(data,ui,store.isAdmin()),admin:()=>adminPage(data,ui)};
  const scrollChat = ui.tab==='home' ? document.getElementById('live-chat-list') : ui.tab==='doubts' ? document.getElementById('doubts-list') : null;
  const oldScroll=scrollChat?scrollChat.scrollTop:null;
  host.innerHTML=(pages[ui.tab]||pages.home)();updateNavigation(ui.tab,data);
  const box=document.getElementById(ui.tab==='home'?'live-chat-list':'doubts-list');if(box && oldScroll!==null)box.scrollTop=oldScroll;
}
function navigate(tab){if(!store.user()||store.user().role==='unenrolled'||(tab==='admin'&&!store.isAdmin()))return;ui.tab=tab; if(tab==='home')ui.search='';renderPage();document.querySelector('.workspace')?.scrollTo(0,0);window.scrollTo(0,0);}
function refreshUI(){if(!store.user())showLogin();else if(!pageInitialized)mountApp();else renderPage();}
store.subscribe(refreshUI);
async function refreshData({silent=true,force=false}={}) {
  if(loading||!store.user()||store.user().role==='unenrolled')return;
  loading=true;
  try {
    const next=await api('/classroom');
    if(currentVersion!==null && currentVersion!==next.test.version) {ui.answers={};ui.testSubmitted=false;ui.quizScore=null;ui.reviewCorrect=null;}
    currentVersion=next.test.version;
    if(next.test.myResult) {ui.testSubmitted=true;ui.quizScore=next.test.myResult.score;ui.reviewCorrect=next.test.myResult.correct;ui.answers=next.test.myResult.answers||{};}
    const focused = document.activeElement;
    const typing = !force && focused && ['INPUT','TEXTAREA','SELECT'].includes(focused.tagName);
    const playerActive = document.querySelector('.player-frame iframe, .player-frame video');
    const playerStillSame = playerActive && ui.tab==='home' && !force &&
      JSON.stringify(store.get().liveStream) === JSON.stringify(next.liveStream);
    if (playerStillSame) {
      // A full dashboard re-render would destroy an iframe and restart the lecture.
      store.setData(next,false);
      updateNavigation(ui.tab,next);
      const list=document.getElementById('live-chat-list');
      if(list) {
        const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<100;
        list.innerHTML=messagesList(next.liveChat,'It’s quiet here','Ask a question or say hello to your class.');
        if(bottom)list.scrollTop=list.scrollHeight;
      }
    } else store.setData(next,!typing);
  } catch(err) {if(err.status===401){store.clear();toast('Session expired. Please sign in again.',true);}else if(!silent)toast(err.message,true);}
  finally{loading=false;}
}
async function establishSession(){
  const {user}=await api('/auth/me');
  store.setUser(user);
  if(user.role!=='unenrolled')await refreshData({silent:false});
}
async function doLogout(){try{await api('/auth/logout',{method:'POST',body:{}});}finally{currentVersion=null;ui.testSubmitted=false;ui.answers={};store.clear();}}
async function mutate(method,path,body,message='Saved.'){
  await api(path,{method,body});await refreshData({silent:false,force:path!=='/chat'});if(message)toast(message);
}
document.addEventListener('click',async event=>{
  const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
  const el=event.target.closest('[data-action]');if(!el)return;
  const {action,id,index,option,mode,filter}=el.dataset;
  try{
    switch(action){
      case 'import-remove':if(ui.importDraft){ui.importDraft.questions.splice(Number(index),1);renderPage();}break;
      case 'import-discard':ui.importDraft=null;ui.importTitle='';renderPage();break;
      case 'import-publish':await publishImportedQuestions();break;
      case 'auth-mode':ui.mode=mode;showLogin();break;
      case 'logout':await doLogout();break;
      case 'filter-notes':ui.notesFilter=filter;renderPage();break;
      case 'play-lecture':{const lec=store.get().lectures.find(x=>x.id===id);if(lec?.url){ui.activeVideo={title:lec.title,url:lec.url,live:false};navigate('home');}break;}
      case 'join-live':ui.activeVideo=null;navigate('home');document.querySelector('.main-player-card')?.scrollIntoView({behavior:'smooth',block:'center'});break;
      case 'answer':if(!ui.testSubmitted){ui.answers[Number(index)]=Number(option);renderPage();}break;
      case 'submit-test':await submitTest();break;
      case 'retake':ui.answers={};ui.testSubmitted=false;ui.quizScore=null;ui.reviewCorrect=null;renderPage();break;
      case 'upload-mode':ui.uploadMode=mode;renderPage();break;
      case 'remove-photo':ui.photo=null;renderPage();break;
      case 'delete-lecture':if(confirm('Delete this lecture? Uploaded media remains in Cloudinary.'))await mutate('DELETE',`/lectures/${id}`,undefined,'Lecture removed.');break;
      case 'delete-note':if(confirm('Delete this resource? Uploaded media remains in Cloudinary.'))await mutate('DELETE',`/notes/${id}`,undefined,'Resource removed.');break;
      case 'delete-doubt':if(confirm('Remove this doubt?'))await mutate('DELETE',`/doubts/${id}`,undefined,'Doubt removed.');break;
      case 'delete-question':{const q=store.get().test.questions[Number(index)];if(q && confirm('Remove this question? Scores will reset for the updated test.'))await mutate('DELETE',`/test/questions/${q.id}`,undefined,'Question removed.');break;}
      case 'clear-test':if(confirm('Delete all quiz questions?'))await mutate('POST','/test/clear',{},'Quiz cleared.');break;
      case 'clear-leaderboard':if(confirm('Clear the current quiz leaderboard?'))await mutate('POST','/test/leaderboard/clear',{},'Leaderboard cleared.');break;
      case 'clear-chat':if(confirm('Remove all classroom messages?'))await mutate('POST','/chat/clear',{},'Chat cleared.');break;
      case 'end-live':await mutate('POST','/live',{isLive:false},'Live class ended.');ui.activeVideo=null;break;
    }
  }catch(err){toast(err.message,true);}
});
document.addEventListener('input',event=>{
  if(event.target.id==='import-test-title'){ui.importTitle=event.target.value;return;}
  const field=event.target.dataset?.importField, container=event.target.closest?.('[data-import-index]');
  if(field && container && ui.importDraft){const q=ui.importDraft.questions[Number(container.dataset.importIndex)];if(q){
    if(field==='q')q.q=event.target.value;
    else if(field.startsWith('option'))q.options[Number(field.slice(-1))]=event.target.value;
    else if(field==='correct')q.correct=Number(event.target.value);
    else if(field==='verified')q.needsReview=!event.target.checked;
  }return;}
  if(event.target.id==='global-search'){ui.search=event.target.value;if(['lectures','notes'].includes(ui.tab))renderPage();}});
document.addEventListener('keydown',event=>{if(event.target.id==='global-search'&&event.key==='Enter'){event.preventDefault();navigate('lectures');}});
document.addEventListener('change',async event=>{
  if(event.target.id!=='doubt-photo-input')return;
  const file=event.target.files?.[0];if(!file)return;
  try{if(file.size>10*1048576)throw new Error('Please select an image under 10 MB.');ui.photo=await compressPhoto(file);renderPage();toast('Photo ready to attach.');}
  catch(err){toast(err.message,true);}
});
document.addEventListener('submit',async event=>{
  const form=event.target, id=form?.id;
  if(!['login-form','join-form','live-chat-form','doubt-form','publish-form','live-form','question-form','question-import-form'].includes(id))return;
  event.preventDefault();
  const button=form.querySelector('[type="submit"]');if(button?.disabled)return;if(button)button.disabled=true;
  try{
    if(id==='login-form'){
      if(ui.mode==='register') {
        await api('/auth/register',{method:'POST',body:{name:form.elements.name.value,email:form.elements.email.value,password:form.elements.password.value,batchCode:form.elements.batchCode.value}});
        ui.mode='login';showLogin();toast('Account created. Please sign in.');
      } else {
        await api('/auth/login',{method:'POST',body:{email:form.elements.email.value,password:form.elements.password.value}});
        await establishSession();
      }
    }
    if(id==='join-form'){await api('/auth/join',{method:'POST',body:{batchCode:form.elements.code.value}});await establishSession();toast('Welcome to the classroom!');}
    if(id==='live-chat-form') {const text=form.elements.message.value.trim();if(text){await mutate('POST','/chat',{text},null);form.reset();const chat=document.getElementById('live-chat-list');if(chat)chat.scrollTop=chat.scrollHeight;}}
    if(id==='doubt-form'){
      const text=form.elements.message.value.trim();let photo='';
      if(ui.photo){const file=dataUrlFile(ui.photo.data);const upload=await signedUpload(file,'doubt');photo=upload.url;}
      await mutate('POST','/doubts',{text,photo},'Your doubt was posted.');ui.photo=null;
    }
    if(id==='publish-form')await publish(form);
    if(id==='live-form'){
      const title=form.elements.title.value.trim()||'Live class with Punit Sir';
      const url=form.elements.url.value.trim();
      await mutate('POST','/live',{isLive:true,title,url},'Live class published.');ui.activeVideo=null;
    }
    if(id==='question-import-form'){
      const file=form.elements.file.files?.[0];
      if(!file||file.size>8*1048576)throw new Error('Choose a PDF or DOCX file smaller than 8 MB.');
      if(!/\.(pdf|docx)$/i.test(file.name))throw new Error('Only PDF or DOCX files are accepted.');
      toast('Extracting questions with AI. Large documents may take some time.');
      const base64=await readBase64(file);
      const result=await api('/test/import/preview',{method:'POST',body:{filename:file.name,base64}});
      ui.importDraft=result;ui.importTitle=store.get().test.title||file.name.replace(/\.(pdf|docx)$/i,'');
      renderPage();toast(`Extracted ${result.questions.length} questions. Review before publishing.`);
    }
    if(id==='question-form'){
      const options=[0,1,2,3].map(i=>form.elements[`option${i}`].value.trim());
      await mutate('POST','/test/questions',{q:form.elements.question.value.trim(),options,correct:Number(form.elements.correct.value),title:form.elements.testTitle.value.trim()},'Quiz question added.');
    }
  }catch(err){if(id==='login-form')loginError(err.message);else toast(err.message,true);}finally{if(button?.isConnected)button.disabled=false;}
});
function readBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read document.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});}
async function publishImportedQuestions(){
  if(!ui.importDraft?.questions?.length)throw new Error('There are no questions to publish.');
  const qs=ui.importDraft.questions;
  if(qs.some(q=>!q.q?.trim()||q.options?.length!==4||q.options.some(o=>!o.trim())||q.correct<0||q.correct>3||q.needsReview))throw new Error('Review every flagged question, fill missing options and verify every correct answer.');
  if(store.get().test.questions.length+qs.length>100)throw new Error('Test supports 100 questions maximum. Clear or remove existing questions first.');
  if(!confirm(`Publish ${qs.length} questions? Existing quiz scores will reset for this updated test.`))return;
  const title=ui.importTitle.trim()||'Imported test';
  const result=await api('/test/import/publish',{method:'POST',body:{title,questions:qs.map(({q,options,correct})=>({q,options,correct}))}});
  ui.importDraft=null;ui.importTitle='';await refreshData({silent:false,force:true});toast(`${result.added} questions published.`);navigate('tests');
}
async function publish(form){
  const title=form.elements.title.value.trim(), chapter=form.elements.chapter.value.trim()||'General',category=form.elements.category.value;
  let url='',size='Link',bytes=0;
  if(ui.uploadMode==='link')url=form.elements.url.value.trim();
  else{
    const file=form.elements.file.files?.[0];if(!file)throw new Error('Choose a file.');
    if(category==='video'&&!file.type.startsWith('video/'))throw new Error('Choose a video file.');
    if(category!=='video'&&!(file.type==='application/pdf'||file.type.startsWith('image/')))throw new Error('Choose a PDF or image.');
    const wrap=document.getElementById('upload-progress-wrap');if(wrap)wrap.hidden=false;
    const uploaded=await signedUpload(file,'content',percent=>{const bar=document.getElementById('upload-bar'),label=document.getElementById('upload-percent');if(bar)bar.style.width=percent+'%';if(label)label.textContent=percent+'%';});
    url=uploaded.url;bytes=uploaded.bytes;size=`${(bytes/1048576).toFixed(2)} MB`;
  }
  await mutate('POST','/publish',{title,chapter,category,url,size,bytes},'Resource published for the class.');navigate(category==='video'?'lectures':'notes');
}
async function submitTest(){
  if(ui.testSubmitted || !Object.keys(ui.answers).length){toast('Answer at least one question.',true);return;}
  const result=await api('/test/submit',{method:'POST',body:{answers:ui.answers,version:store.get().test.version}});
  ui.testSubmitted=true;ui.quizScore=result.score;ui.reviewCorrect=result.correct;
  await refreshData({silent:false,force:true});toast(`Quiz submitted: ${result.score} / ${result.maxScore}`);
}
async function boot(){
  root.innerHTML='<div class="app-loading" role="status">Connecting to your classroom…</div>';
  try{
    const c=await api('/config');ui.uploadsEnabled=Boolean(c.uploadsEnabled);
    await establishSession();
  }catch(err){if(err.status!==401)toast('Sign-in service is not available. Check backend configuration.',true);showLogin();}
}
boot();
setInterval(()=>{if(document.visibilityState==='visible'&&store.user()?.role!=='unenrolled')refreshData();},10000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshData();});
