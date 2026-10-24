export async function api(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method, credentials:'same-origin', signal,
    headers: { ...(method !== 'GET' ? {'Content-Type':'application/json','X-Punit-CSRF':'1'} : {}) },
    body:body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const error = new Error(data.error || 'Request failed'); error.status=res.status; throw error; }
  return data;
}
export async function signedUpload(file, purpose, onProgress = () => {}) {
  const max = purpose === 'doubt' ? 5 * 1048576 : 100 * 1048576;
  if (file.size > max) throw new Error(`Files must be smaller than ${Math.round(max/1048576)} MB.`);
  const config=await api('/uploads/sign',{method:'POST',body:{purpose}});
  return new Promise((resolve,reject) => {
    const form=new FormData();
    for (const field of ['apiKey','folder','public_id','timestamp','signature']) {
      const cloudinaryName = field === 'apiKey' ? 'api_key' : field;
      form.append(cloudinaryName, String(config[field]));
    }
    form.append('file',file);
    const xhr=new XMLHttpRequest();
    xhr.open('POST',`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/${config.resourceType}/upload`);
    xhr.upload.onprogress=e=> {if(e.lengthComputable) onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{let json={};try{json=JSON.parse(xhr.responseText);}catch{};
      if(xhr.status>=200 && xhr.status<300 && json.secure_url) resolve({url:json.secure_url,bytes:json.bytes||file.size});
      else reject(new Error(json.error?.message||'Cloudinary upload failed.'));
    };
    xhr.onerror=()=>reject(new Error('Could not upload file. Check network connection.'));
    xhr.send(form);
  });
}
export function dataUrlFile(url) {
  const [header,base64]=url.split(',');
  const match=header.match(/^data:(image\/(?:jpeg|png|webp));base64$/);
  if (!match) throw new Error('Unsupported image.');
  const binary=atob(base64), arr=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)arr[i]=binary.charCodeAt(i);
  return new File([arr],`doubt-${Date.now()}.jpg`,{type:match[1]});
}
