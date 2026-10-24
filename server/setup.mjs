import { config, createAppwrite } from './appwrite.mjs';
const app=createAppwrite();
const cfg=config();
if(!cfg.project || !cfg.key) { console.error('Set APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.'); process.exit(1); }
const schema = {
  members:{userId:'s36',email:'s320',joinedAt:'s64'},
  settings:{testTitle:'s150',testVersion:'int',isLive:'bool',liveTitle:'s150',liveUrl:'s2048'},
  lectures:{title:'s160',chapter:'s100',url:'s2048',bytes:'int',createdAt:'s64',date:'s64'},
  notes:{title:'s160',chapter:'s100',url:'s2048',bytes:'int',createdAt:'s64',category:'s64',size:'s40'},
  questions:{q:'text',options:'text',correct:'int',createdAt:'s64'},
  submissions:{userId:'s36',name:'s160',score:'int',total:'int',testVersion:'int',answers:'text',time:'s64'},
  live_chat:{sender:'s160',senderId:'s36',role:'s20',text:'text',time:'s64',createdAt:'s64'},
  doubts:{sender:'s160',senderId:'s36',role:'s20',text:'text',photo:'s2048',time:'s64',createdAt:'s64'},
};
async function safe(action,label) {
  try { await action(); console.log('Created',label); }
  catch(e) { if(e.status===409) console.log('Exists',label); else throw e; }
}
async function retry(action,label) {
  for(let i=0;i<25;i++) {
    try { return await action(); }
    catch(e) {
      if(e.status===409) {console.log('Exists',label);return;}
      if(i===24 || ![400,404,409,503].includes(e.status)) throw e;
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
  }
}
// Reuse a database created in the Appwrite Console instead of blindly creating another.
// Appwrite Free plans permit a limited number of databases.
try {
  await app.request(app.dbPath, { admin: true });
  console.log(`Using existing TablesDB database: ${cfg.database}`);
} catch (error) {
  if (error.status !== 404) throw error;
  try {
    await safe(() => app.request('/tablesdb', { method:'POST', admin:true,
      body:{databaseId:cfg.database,name:'Punit Classes Production',specification:'serverless'} }), 'database');
  } catch (createError) {
    if (createError.status === 403 && /maximum number of databases/i.test(createError.message)) {
      throw new Error('Your Appwrite plan database limit is reached. Set APPWRITE_DATABASE_ID in .env to the ID of the existing TablesDB database shown in Appwrite Console > Databases, then rerun npm run db:setup.');
    }
    throw createError;
  }
}
for(const [table,fields] of Object.entries(schema)) {
  const base=`${app.dbPath}/tables`;
  await safe(()=>app.request(base,{method:'POST',admin:true,body:{tableId:table,name:table.replaceAll('_',' '),permissions:[],rowSecurity:false}}),`table ${table}`);
  for(const [key,type] of Object.entries(fields)) {
    const path=`${base}/${table}/columns`;
    const body={key,required:false};
    const kind=type==='int'?'integer':type==='bool'?'boolean':type==='text'?'text':'varchar';
    if(type.startsWith('s')) body.size=Number(type.slice(1));
    await safe(()=>app.request(`${path}/${kind}`,{method:'POST',admin:true,body}),`${table}.${key}`);
  }
}
// Column creation may be asynchronous; wait until Appwrite accepts the settings row.
await retry(()=>app.create('settings',{testTitle:'',testVersion:1,isLive:false,liveTitle:'',liveUrl:''},'classroom'),'classroom settings');
console.log('TablesDB setup complete. All tables are private; the Node backend enforces permissions.');
