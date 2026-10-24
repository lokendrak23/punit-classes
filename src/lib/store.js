const empty = () => ({usedStorageMB:0,liveStream:{isLive:false,title:'',youtubeUrl:''},lectures:[],notes:[],test:{title:'',version:1,questions:[]},leaderboard:[],liveChat:[],doubts:[]});
const listeners = new Set();
let data=empty(), user=null;
export const store={
  get:()=>data,user:()=>user,isAdmin:()=>user?.role==='admin',
  subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  setData(value,notify=true){data={...empty(),...value};if(notify) listeners.forEach(fn=>fn());},
  setUser(value){user=value; listeners.forEach(fn=>fn());},
  clear(){user=null;data=empty();listeners.forEach(fn=>fn());}
};
