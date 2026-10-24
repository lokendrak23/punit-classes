import test from 'node:test';
import assert from 'node:assert/strict';
import {renderShell} from '../src/components/layout.js';
import {adminPage} from '../src/pages/admin.js';
const data={lectures:[],notes:[],doubts:[],test:{questions:[],title:'New test'},liveStream:{isLive:false,title:'',youtubeUrl:''},leaderboard:[],usedStorageMB:0};
test('mobile faculty navigation retains admin and every student destination',()=>{
  const html=renderShell({role:'admin',name:'Punit Sir'},'admin',data);
  assert.match(html,/class="app-layout is-faculty"/);
  assert.match(html,/class="faculty-mobile-entry is-active"/);
  assert.match(html,/>Admin panel</);
  assert.match(html,/data-nav="admin"/);
  for(const id of ['home','lectures','notes','tests','doubts'])assert.match(html,new RegExp(`data-nav="${id}"`));
  assert.match(html,/data-action="logout"[^>]+aria-label="Log out"/);
  assert.match(html,/>Log out</);
});
test('student navigation has logout and five tabs, but no faculty controls',()=>{
  const html=renderShell({role:'student',name:'Student'},'home',data);
  assert.doesNotMatch(html,/faculty-mobile-entry|data-nav="admin"|app-layout is-faculty/);
  assert.equal((html.match(/class="bottom-link /g)||[]).length,5);
  assert.match(html,/aria-label="Log out"/);
});
test('admin upload, test importer, and live controls remain in dashboard',()=>{
  const html=adminPage(data,{uploadMode:'link',uploadsEnabled:true,importDraft:null});
  for (const id of ['admin-content','admin-import','admin-live','admin-manage'])
    assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/id="publish-form"/);
  assert.match(html,/id="question-form"/);
  assert.match(html,/id="question-import-form"/);
});
