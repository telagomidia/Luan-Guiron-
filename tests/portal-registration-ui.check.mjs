import fs from 'node:fs';
import assert from 'node:assert/strict';
const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
for(const mode of ['missing','completed','failure']){
 const w=new Window({url:'https://portal.test/portal.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true}});
 w.document.write(read('portal.html').replace(/<script\b[\s\S]*?<\/script>/g,''));w.scrollTo=()=>{};
 const profile={id:'qa',role:'student',active:true,full_name:'Aluno QA'};
 const api={profile:async()=>profile,plans:async()=>[],sessions:async()=>[],assessments:async()=>[],sessionsMonth:async()=>[],anamnesis:async()=>{if(mode==='failure')throw Error('offline');return mode==='completed'?{id:'anam-sent'}:null;}};
 w.LG_AUTH={createClient:()=>({rpc:async()=>({data:{allowed:true}})}),access:async()=>({user:{id:'qa'},profile}),sessionExpired:()=>false,message:()=> 'Falha'};
 for(const file of ['workout-journal.js','anamnesis-schema.js','portal-model.js','portal-views.js'])w.eval(read(file));
 w.LG_PORTAL={...w.LG_PORTAL,createApi:()=>api};w.eval(read('portal-app.js'));
 const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setTimeout(resolve,0));};await settle();
 const dialog=w.document.querySelector('.registration-needed');
 if(mode==='missing'){assert.equal(dialog.open,true);assert.match(dialog.textContent,/Finalize seu cadastro/);dialog.querySelector('#finishRegistration').click();await settle();assert.equal(w.location.hash,'#anamnesis');assert.ok(w.document.querySelector('#anamForm'));assert.equal(w.document.querySelector('.registration-needed'),null);}
 else {assert.equal(dialog,null);if(mode==='failure')assert.ok(w.document.querySelector('#retryPortal'));}
 await w.happyDOM.close();
}
console.log('PASS: missing anamnesis prompts completion, sent anamnesis never prompts, query failure never claims a missing submission');
