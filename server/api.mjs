import { createHash } from 'node:crypto';
import { createAppwrite } from './appwrite.mjs';
import { assert, HttpError, required, emailValid, strongPassword, compareSecret, allowedLink, cloudPhotoUrl, cleanText, scoreQuiz, rank, shaId, appwriteCookieHeaders, clearCookies, uuid, rateLimiter } from './security.mjs';
const defaults = { testTitle:'', testVersion:1, isLive:false, liveTitle:'', liveUrl:'' };
const time = () => new Date().toISOString();
const publicDate = date => new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const publicClock = date => new Date(date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
const cleanDoc = doc => { const { $id:id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, $sequence, ...rest } = doc; return { id, ...rest }; };
function parseAnswers(body, count) {
  const raw = body?.answers;
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 400, 'Answers must be an object.');
  const answers = {};
  for (const [key, answer] of Object.entries(raw)) {
    const i = Number(key);
    assert(Number.isInteger(i) && String(i) === key && i >= 0 && i < count && Number.isInteger(answer) && answer >= 0 && answer <= 3, 400, 'Invalid quiz answer.');
    answers[i] = answer;
  }
  return answers;
}

export function createApi(env = process.env, app = createAppwrite(env)) {
  const teachers = new Set((env.TEACHER_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
  const canUpload = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  const secured = env.NODE_ENV === 'production';
  const throttle = rateLimiter();
  const snapshots = new Map();
  const authThrottle = rateLimiter({ windowMs: 15*60_000, limit: 18 });
  async function profile(cookie) {
    const account = await app.me(cookie);
    if (teachers.has(account.$id)) return { id:account.$id, name:account.name, email:account.email, role:'admin' };
    const member = await app.find('members', account.$id);
    if (!member) return { id:account.$id, name:account.name, email:account.email, role:'unenrolled' };
    return { id:account.$id, name:account.name, email:account.email, role:'student' };
  }
  async function settings() { return { ...defaults, ...(await app.find('settings','classroom') || {}) }; }
  async function bump(s) { await app.put('settings', 'classroom', { testTitle:s.testTitle || '', testVersion:Number(s.testVersion||1)+1, isLive:Boolean(s.isLive), liveTitle:s.liveTitle||'', liveUrl:s.liveUrl||'' }); }
  const removeMany = async (collection, filter = () => true) => {
    const docs = await app.list(collection);
    for (const doc of docs.filter(filter)) await app.delete(collection,doc.$id);
  };
  async function classroom(user) {
    let cached = snapshots.get('shared');
    if (!cached || cached.expires <= Date.now()) {
      const build = Promise.all([
        settings(), app.list('lectures'), app.list('notes'), app.list('questions'),
        app.list('submissions'), app.list('live_chat'), app.list('doubts')
      ]);
      cached = { promise:build, expires:Date.now()+3000 };
      snapshots.set('shared',cached);
    }
    let s,lec,notes,questions,submissions,liveChat,doubts;
    try { [s,lec,notes,questions,submissions,liveChat,doubts] = await cached.promise; }
    catch (error) { snapshots.delete('shared'); throw error; }
    const orderedQs = [...questions].sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
    const activeSubs = submissions.filter(x => Number(x.testVersion) === Number(s.testVersion));
    const publicQ = orderedQs.map(q => user.role === 'admin' ? cleanDoc(q) : (({ correct, ...safe }) => safe)(cleanDoc(q)));
    const mine = user.role !== 'admin' ? activeSubs.find(x => x.userId === user.id) : null;
    const leaderboard = rank(activeSubs.map(x => ({ name:x.name, score:x.score, total:orderedQs.length*4, time:x.time, userId:x.userId, $createdAt:x.$createdAt }))).map(({ $createdAt,...rest }) => rest);
    return {
      usedStorageMB: [...lec,...notes].reduce((sum,x) => sum + (Number(x.bytes)||0)/1048576, 0),
      liveStream: { isLive: Boolean(s.isLive), title:s.liveTitle||'', youtubeUrl:s.liveUrl||'' },
      lectures: lec.map(cleanDoc).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')),
      notes: notes.map(cleanDoc).sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')),
      test: { title:s.testTitle||'', version:s.testVersion, questions:publicQ,
        myResult: mine ? { score:mine.score, maxScore:orderedQs.length*4, answers:mine.answers||{}, correct:orderedQs.map(q=>q.correct) } : null },
      leaderboard,
      liveChat: liveChat.map(cleanDoc).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).slice(-150),
      doubts: doubts.map(cleanDoc).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).slice(-150),
    };
  }
  async function handle({ method, path, body, cookie, origin, remoteIP }) {
    const ip = remoteIP || 'unknown';
    if (method !== 'GET') snapshots.clear();
    // Key classroom limits to the session, so students sharing a school Wi-Fi IP do not block each other.
    assert(throttle(`${cookie ? shaId(cookie) : ip}:${path}`),429,'Too many requests. Please slow down.');
    if (method === 'GET' && path === '/api/health') return { status:200, body:{ ok:true, service:'punit-classes' } };
    if (method === 'GET' && path === '/api/config') return { status:200, body:{ uploadsEnabled: canUpload } };
    if (method === 'POST' && ['/api/auth/login','/api/auth/register'].includes(path)) assert(authThrottle(`${ip}:${String(body?.email||'').toLowerCase()}`),429,'Too many attempts. Try again later.');
    if (method === 'POST' && path === '/api/auth/register') {
      assert(required(body?.name,80) && emailValid(body?.email) && strongPassword(body?.password),400,'Provide name, valid email and a password of at least 12 characters.');
      assert(compareSecret(cleanText(body?.batchCode,80).toUpperCase(),(env.BATCH_ACCESS_CODE||'').toUpperCase()),403,'Incorrect batch code.');
      const email = body.email.toLowerCase().trim();
      const user = await app.register({ name:body.name.trim(), email, password:body.password });
      // If creation of membership fails, the user can sign in and retry joining with code.
      await app.put('members',user.$id,{ userId:user.$id, email, joinedAt:time() });
      return { status:201, body:{ ok:true, message:'Account created. Sign in to continue.' } };
    }
    if (method === 'POST' && path === '/api/auth/login') {
      assert(emailValid(body?.email) && typeof body?.password === 'string',400,'Enter your email and password.');
      const result = await app.login({ email:body.email.trim(), password:body.password });
      const setCookies = appwriteCookieHeaders(result.headers, secured);
      assert(setCookies.length > 0,502,'Appwrite did not return a login session cookie. Check API endpoint and authentication settings.');
      return { status:200, headers:{ 'Set-Cookie':setCookies }, body:{ ok:true } };
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      try { if (cookie) await app.logout(cookie); } catch {} // revoke best-effort; always clear local cookie
      return { status:200, headers:{'Set-Cookie': clearCookies(cookie, secured)}, body:{ok:true} };
    }
    let user;
    try { user = await profile(cookie); }
    catch (e) { if ([401,403].includes(e.status)) throw new HttpError(401,'Please sign in again.'); throw e; }
    if (method === 'GET' && path === '/api/auth/me') return { status:200, body:{ user } };
    if (method === 'POST' && path === '/api/auth/join') {
      assert(user.role === 'unenrolled',409,'Already enrolled.');
      assert(compareSecret(cleanText(body?.batchCode,80).toUpperCase(),(env.BATCH_ACCESS_CODE||'').toUpperCase()),403,'Incorrect batch code.');
      await app.put('members',user.id,{ userId:user.id, email:user.email, joinedAt:time() });
      return { status:200, body:{ ok:true } };
    }
    assert(user.role !== 'unenrolled',403,'Your account is not enrolled in this batch.');
    if (method === 'GET' && path === '/api/classroom') return {status:200, body:await classroom(user)};
    if (method === 'POST' && path === '/api/chat') {
      assert(required(body?.text,1000),400,'Message must be between 1 and 1000 characters.');
      await app.create('live_chat',{ sender:user.name, senderId:user.id, role:user.role, text:body.text.trim(), time:publicClock(time()), createdAt:time() });
      return {status:201,body:{ok:true}};
    }
    if (method === 'POST' && path === '/api/doubts') {
      assert(required(body?.text,2000) || body?.photo,400,'Enter a question or attach a photo.');
      assert(!body?.photo || cloudPhotoUrl(body.photo,env.CLOUDINARY_CLOUD_NAME),400,'Upload a photo to the authorized Cloudinary folder.');
      await app.create('doubts',{ sender:user.name, senderId:user.id, role:user.role, text:cleanText(body.text,2000)||'Attached a question photo', photo:body.photo||'', time:publicClock(time()), createdAt:time() });
      return {status:201,body:{ok:true}};
    }
    if (method === 'POST' && path === '/api/test/submit') {
      const s=await settings();
      const qs=(await app.list('questions')).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
      assert(qs.length>0,400,'There is no active quiz.');
      assert(body?.version === s.testVersion,409,'The test has changed. Reload before submitting.');
      const key=shaId(`${s.testVersion}:${user.id}`);
      const prior=await app.find('submissions',key);
      assert(!prior,409,'You have already submitted this test. Your first attempt is final.');
      const answers=parseAnswers(body,qs.length);
      assert(Object.keys(answers).length>0,400,'Please answer at least one question.');
      const score=scoreQuiz(qs,answers);
      await app.create('submissions',{ userId:user.id, name:user.name, score, total:qs.length*4, testVersion:s.testVersion, answers, time:publicClock(time()) },key);
      return {status:200, body:{ score, maxScore:qs.length*4, correct:qs.map(q=>q.correct) } };
    }
    if (method === 'POST' && path === '/api/uploads/sign') {
      assert(canUpload,503,'Cloudinary is not configured.');
      const purpose=body?.purpose;
      assert(purpose==='doubt' || purpose==='content',400,'Invalid upload purpose.');
      assert(purpose !== 'content' || user.role==='admin',403,'Faculty only.');
      const timestamp=Math.floor(Date.now()/1000);
      const folder=purpose==='doubt'?'punit-classes/doubts':'punit-classes/content';
      const public_id=uuid();
      const params={folder, public_id, timestamp};
      const toSign=Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join('&');
      const signature=createHash('sha1').update(toSign+env.CLOUDINARY_API_SECRET).digest('hex');
      return {status:200,body:{ apiKey:env.CLOUDINARY_API_KEY, cloudName:env.CLOUDINARY_CLOUD_NAME, folder, public_id, timestamp, signature, resourceType:purpose==='doubt'?'image':'auto' }};
    }
    const isFaculty = user.role==='admin';
    assert(isFaculty,403,'Only Punit Sir can manage classroom content.');
    if (method==='POST' && path==='/api/publish') {
      assert(required(body?.title,160) && required(body?.chapter,100),400,'Title and chapter are required.');
      assert(['video','Class Notes','DPP (Practice Sheet)'].includes(body.category),400,'Invalid content type.');
      assert(allowedLink(body.url),400,'Provide a valid HTTPS resource URL.');
      const isVideo=body.category==='video';
      const data={ title:body.title.trim(), chapter:body.chapter.trim(), url:body.url.trim(), bytes:Math.min(Math.max(Number(body.bytes)||0,0),1073741824), createdAt:time() };
      if(isVideo) await app.create('lectures',{ ...data, date:publicDate(time()) });
      else await app.create('notes',{...data,category:body.category,size:cleanText(body.size,40)||'Link'});
      return {status:201,body:{ok:true}};
    }
    if (method==='POST' && path==='/api/live') {
      assert(typeof body?.isLive === 'boolean',400,'Invalid live status.');
      assert(!body.isLive || (required(body.title,150) && allowedLink(body.url)),400,'Title and HTTPS link are required.');
      const s=await settings();
      await app.put('settings','classroom',{ testTitle:s.testTitle||'', testVersion:s.testVersion, isLive:body.isLive, liveTitle:body.isLive?body.title.trim():'', liveUrl:body.isLive?body.url.trim():'' });
      return {status:200,body:{ok:true}};
    }
    if (method==='POST' && path==='/api/test/questions') {
      assert(required(body?.q,1000) && Array.isArray(body?.options) && body.options.length===4 && body.options.every(x=>required(x,300)),400,'Provide a question and four options.');
      assert(Number.isInteger(body.correct) && body.correct>=0 && body.correct<=3,400,'Choose the correct option.');
      const s=await settings();
      const existing=(await app.list('questions')).length;
      assert(existing<100,400,'A test supports up to 100 questions.');
      await app.create('questions',{ q:body.q.trim(), options:body.options.map(x=>x.trim()), correct:body.correct, createdAt:time() });
      // Change version, so old scores cannot appear on a changed test.
      await bump({...s,testTitle:cleanText(body.title,150)||s.testTitle||'Class practice quiz'});
      return {status:201,body:{ok:true}};
    }
    if (method==='POST' && path==='/api/test/clear') {
      await removeMany('questions'); await bump({...await settings(), testTitle:''});
      return {status:200,body:{ok:true}};
    }
    if (method==='POST' && path==='/api/test/leaderboard/clear') {
      const s=await settings(); await removeMany('submissions', x => x.testVersion===s.testVersion);
      return {status:200,body:{ok:true}};
    }
    if (method==='POST' && path==='/api/chat/clear') { await removeMany('live_chat'); return {status:200,body:{ok:true}}; }
    const match=path.match(/^\/api\/(lectures|notes|doubts|test\/questions)\/([a-zA-Z0-9_-]{1,36})$/);
    if (method==='DELETE' && match) {
      const collection=({lectures:'lectures',notes:'notes',doubts:'doubts','test/questions':'questions'})[match[1]];
      const doc=await app.find(collection,match[2]);
      assert(doc,404,'Item not found.');
      await app.delete(collection,match[2]);
      if(collection==='questions') await bump(await settings());
      return {status:200,body:{ok:true}};
    }
    throw new HttpError(404,'Route not found.');
  }
  return { handle, profile, classroom };
}
