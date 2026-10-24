import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../server/api.mjs';
import { createServer } from '../server/index.mjs';
import { scoreQuiz, compareSecret, cloudPhotoUrl, appwriteCookieHeaders } from '../server/security.mjs';
import { createAppwrite } from '../server/appwrite.mjs';
const env={TEACHER_USER_IDS:'faculty_1', BATCH_ACCESS_CODE:'SUPERLONG-SECRET', CLOUDINARY_CLOUD_NAME:'testcloud', CLOUDINARY_API_KEY:'testkey', CLOUDINARY_API_SECRET:'testsecret',APPWRITE_PROJECT_ID:'project1',APPWRITE_API_KEY:'rootsecret'};
function fakeDB(){
 const collections=Object.fromEntries(['members','settings','lectures','notes','questions','submissions','live_chat','doubts'].map(n=>[n,new Map()]));
 collections.members.set('student_1',{$id:'student_1',userId:'student_1'});
 collections.settings.set('classroom',{$id:'classroom',testTitle:'Motion',testVersion:1,isLive:false,liveTitle:'',liveUrl:''});
 collections.questions.set('question1',{$id:'question1',q:'SI acceleration unit?',options:['m/s','m/s²','N','m²'],correct:1,createdAt:'2026-01-01T00:00:00.000Z'});
 let counter=0;
 const app={
   cfg:{},
   async me(cookie){if(!cookie)throw Object.assign(new Error('unauthorized'),{status:401});const id=cookie.includes('faculty')?'faculty_1':cookie.includes('stranger')?'stranger_1':'student_1';return {$id:id,name:id==='faculty_1'?'Punit Sir':'Student A',email:'student@example.com'};},
   async find(collection,id){return collections[collection].get(id)||null;},
   async list(collection){return [...collections[collection].values()];},
   async create(collection,data,id=`item${++counter}`){const doc={$id:id,...data};collections[collection].set(id,doc);return doc;},
   async put(collection,id,data){const doc={$id:id,...data};collections[collection].set(id,doc);return doc;},
   async delete(collection,id){collections[collection].delete(id);},
   async register(o){return {$id:'new_student'};},
   async login(){return {headers:new Headers({'Set-Cookie':'a_session_project1=foo; Path=/; Domain=.cloud.appwrite.io; HttpOnly; Secure'})};},
   async logout(){},
 };
 return {app,collections};
}
const call=(api,method,path,body={},cookie='a_session_project1=student')=>api.handle({method,path,body,cookie,remoteIP:'127.0.0.1'});
test('+4/-1/0 quiz scoring with absent answers',()=>{
 assert.equal(scoreQuiz([{correct:0},{correct:2},{correct:1}],{0:0,1:3}),3);
});
test('batch code constant time comparator and cloudinary photo filter',()=>{
 assert.equal(compareSecret('HELLO','HELLO'),true);
 assert.equal(compareSecret('HELLO','hello'),false);
 assert.equal(cloudPhotoUrl('https://res.cloudinary.com/testcloud/image/upload/v123/punit-classes/doubts/abc.jpg','testcloud'),true);
 assert.equal(cloudPhotoUrl('https://evil.example/image.png','testcloud'),false);
});
test('student gets no correct answers, and cannot publish',async()=>{
 const {app}=fakeDB(),api=createApi(env,app);
 const r=await call(api,'GET','/api/classroom');
 assert.equal(r.body.test.questions[0].correct,undefined);
 await assert.rejects(call(api,'POST','/api/publish',{title:'T',chapter:'C',category:'video',url:'https://youtube.com'}),{status:403});
 await assert.rejects(call(api,'POST','/api/live',{isLive:false}),{status:403});
 await assert.rejects(call(api,'POST','/api/uploads/sign',{purpose:'content'}),{status:403});
});
test('server grades test once and prevents answer-informed leaderboard retakes',async()=>{
 const {app,collections}=fakeDB(),api=createApi(env,app);
 const bad=await call(api,'POST','/api/test/submit',{answers:{0:0},version:1});
 assert.equal(bad.body.score,-1);assert.deepEqual(bad.body.correct,[1]);
 await assert.rejects(call(api,'POST','/api/test/submit',{answers:{0:1},version:1}),{status:409});
 assert.equal([...collections.submissions.values()][0].score,-1);
 const classroom=await call(api,'GET','/api/classroom');
 assert.equal(classroom.body.test.myResult.score,-1);
 assert.deepEqual(classroom.body.test.myResult.correct,[1]);
 assert.equal(classroom.body.test.questions[0].correct,undefined);
 await assert.rejects(call(api,'POST','/api/test/submit',{answers:{0:1},version:5}),{status:409});
});
test('faculty edits shared data and student sees it, stranger cannot access',async()=>{
 const {app}=fakeDB(),api=createApi(env,app);
 await call(api,'POST','/api/publish',{title:'Lesson 01',chapter:'Physics',url:'https://youtu.be/abcdefghijk',category:'video'},'a_session_project1=faculty');
 const r=await call(api,'GET','/api/classroom');
 assert.equal(r.body.lectures.length,1);
 const faculty=await call(api,'GET','/api/classroom',{},'a_session_project1=faculty');
 assert.equal(faculty.body.test.questions[0].correct,1);
 await assert.rejects(call(api,'GET','/api/classroom',{},'a_session_project1=stranger'),{status:403});
});
test('teacher role is determined by authenticated Appwrite user ID, not client supplied fields',async()=>{
 const {app}=fakeDB(),api=createApi(env,app);
 const student=await call(api,'GET','/api/auth/me',{role:'admin',id:'faculty_1'});
 assert.equal(student.body.user.role,'student');
 const faculty=await call(api,'GET','/api/auth/me',{},'a_session_project1=faculty');
 assert.equal(faculty.body.user.role,'admin');
});
test('authorized doubt upload signatures never expose Cloudinary API secret',async()=>{
 const {app}=fakeDB(),api=createApi(env,app);
 const r=await call(api,'POST','/api/uploads/sign',{purpose:'doubt'});
 assert.equal(r.body.cloudName,'testcloud');
 assert.equal(r.body.resourceType,'image');
 assert.equal(r.body.folder,'punit-classes/doubts');
 assert.equal(r.body.apiKey,'testkey');
 assert.ok(/^[a-f0-9]{40}$/.test(r.body.signature));
 assert.equal(JSON.stringify(r.body).includes('testsecret'),false);
});
test('server uses private Appwrite API key for TablesDB, never browser token',async()=>{
 const requests=[];
 const transport=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify({documents:[]}),{status:200,headers:{'Content-Type':'application/json'}});};
 const app=createAppwrite({APPWRITE_ENDPOINT:'https://example.invalid/v1',APPWRITE_PROJECT_ID:'pc',APPWRITE_API_KEY:'serverkey',APPWRITE_DATABASE_ID:'classes'},transport);
 await app.list('lectures');
 assert.match(requests[0].url,/\/tablesdb\/classes\/tables\/lectures\/rows/);
 assert.equal(requests[0].opts.headers['X-Appwrite-Key'],'serverkey');
});
test('HTTP server rejects CSRF-less writes and serves app without .env access',async t=>{
 const {app}=fakeDB();const server=createServer(env,createApi(env,app));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>server.close());
 const base=`http://127.0.0.1:${server.address().port}`;
 const health=await fetch(`${base}/api/health`);assert.equal(health.status,200);
 const forbidden=await fetch(`${base}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'hello'})});
 assert.equal(forbidden.status,403);
 const secret=await fetch(`${base}/.env.example`);assert.equal(secret.status,404);
 const front=await fetch(base);assert.equal(front.status,200);assert.match(await front.text(),/Punit Classes/);
});
test('TablesDB encodes structured quiz fields and decodes row responses',async()=>{
 const requests=[];
 const transport=async(url,opts)=>{
   requests.push({url,opts});
   if(opts.method==='GET')return new Response(JSON.stringify({rows:[{$id:'r1',q:'Question',options:'["A","B","C","D"]',correct:1}]}),{status:200});
   return new Response(JSON.stringify({$id:'r2'}),{status:201});
 };
 const app=createAppwrite({APPWRITE_DATABASE_TYPE:'tablesdb',APPWRITE_ENDPOINT:'https://example.invalid/v1',APPWRITE_PROJECT_ID:'pc',APPWRITE_API_KEY:'serverkey'},transport);
 await app.create('questions',{q:'Question',options:['A','B','C','D'],correct:1},'r2');
 const body=JSON.parse(requests[0].opts.body);
 assert.equal(body.rowId,'r2');
 assert.equal(body.data.options,'["A","B","C","D"]');
 const rows=await app.list('questions');
 assert.deepEqual(rows[0].options,['A','B','C','D']);
});

test('bulk import stays faculty-only and rejects missing/unverified correct answers',async()=>{
 const {app,collections}=fakeDB(),api=createApi(env,app);
 const q={q:'What is force?',options:['Newton','Joule','Watt','Tesla'],correct:0};
 await assert.rejects(call(api,'POST','/api/test/import/publish',{questions:[q]},'a_session_project1=student'),{status:403});
 await assert.rejects(call(api,'POST','/api/test/import/publish',{questions:[{...q,correct:-1}]},'a_session_project1=faculty'),{status:400});
 const r=await call(api,'POST','/api/test/import/publish',{title:'Chapter test',questions:[q]},'a_session_project1=faculty');
 assert.equal(r.body.added,1);
 assert.equal(collections.questions.size,2);
 assert.equal(collections.settings.get('classroom').testVersion,2);
 const student=await call(api,'GET','/api/classroom');
 assert.equal(student.body.test.questions[1].correct,undefined);
});

test('PDF Gemini extraction accepts structured output and refuses oversized uploads',async()=>{
 const { extractQuestions }=await import('../server/importer.mjs');
 const sample=Buffer.from('%PDF-1.4\n').toString('base64');
 const mock=async(url,opts)=>{
   assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
   assert.equal(opts.headers['x-goog-api-key'],'dummy');
   const body=JSON.parse(opts.body);
   assert.equal(body.generationConfig.responseMimeType,'application/json');
   assert.equal(body.contents[0].parts[1].inlineData.mimeType,'application/pdf');
   return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({questions:[{q:'Q?',options:['A','B','C','D'],correct:-1,needsReview:true}],warnings:['Answer key missing']})}]}}]}),{status:200});
 };
 const result=await extractQuestions({filename:'paper.pdf',base64:sample},{GEMINI_API_KEY:'dummy'},mock);
 assert.equal(result.questions.length,1);
 assert.equal(result.questions[0].correct,-1);
 await assert.rejects(extractQuestions({filename:'paper.pdf',base64:'X'.repeat(12_000_000)},{GEMINI_API_KEY:'dummy'},mock),{status:400});
});
test('Gemini quota errors explain next steps',async()=>{
 const {extractQuestions}=await import('../server/importer.mjs');
 const sample=Buffer.from('%PDF-1.4\n').toString('base64');
 const mock=async()=>new Response(JSON.stringify({error:{message:'RESOURCE_EXHAUSTED'}}),{status:429});
 await assert.rejects(extractQuestions({filename:'paper.pdf',base64:sample},{GEMINI_API_KEY:'dummy'},mock),{status:429});
});
