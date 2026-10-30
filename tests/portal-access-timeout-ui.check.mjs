import fs from 'node:fs';import assert from 'node:assert/strict';const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const w=new Window({url:'https://portal.test/portal.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(read('portal.html').replace(/<script\b[\s\S]*?<\/script>/g,''));
const profile={id:'qa',role:'student',active:true,full_name:'Aluno QA'};
w.LG_AUTH={createClient:()=>({rpc:()=>new Promise(()=>{})}),access:async()=>({user:{id:'qa'},profile}),sessionExpired:()=>false,message:()=> 'Não foi possível verificar o acesso.'};
for(const f of ['workout-journal.js','anamnesis-schema.js','portal-model.js','portal-views.js'])w.eval(read(f));w.LG_PORTAL={...w.LG_PORTAL,createApi:()=>({profile:async()=>profile})};
let timeout;const native=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>ms===12000?(timeout=fn,999999):native(fn,ms,...args);
w.eval(read('portal-app.js'));const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setTimeout(r,0));};await settle();assert.ok(timeout);timeout();await settle();assert.ok(w.document.querySelector('#retryPortal'));assert.match(w.document.querySelector('#content').textContent,/Não foi possível/);
console.log('PASS: unanswered initial access check times out and offers recovery');await w.happyDOM.close();
