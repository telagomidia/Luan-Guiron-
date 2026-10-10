// Real portal API/model + teacher UI with synthetic data only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const settings={disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableComputedStyleRendering:true};
const profile={id:'qa-own',full_name:'Aluno QA',birth_date:'1990-01-01',email:'qa@example.invalid',phone:'015000000000',active:true,role:'student'};
let stored=null,writes=0;
const client={from(table){let row;const q={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},range(){return this;},abortSignal(){return this;},single(){return this;},maybeSingle(){return this;},upsert(value){row=value;return this;},then(resolve,reject){if(row){writes++;stored=structuredClone(row);}return Promise.resolve({data:table==='profiles'?profile:table==='anamneses'?row?{id:row.id,student_id:row.student_id}:stored:[]}).then(resolve,reject);}};return q;}};
const w=new Window({url:'https://example.test/portal.html#anamnesis',settings});
w.document.write(read('portal.html').replace(/<script\b[\s\S]*?<\/script>/g,''));
w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=function(){};
w.LG_AUTH={createClient:()=>client,access:async()=>({user:{id:profile.id},profile}),deadline:fn=>fn(),sessionExpired:()=>false,message:()=> 'Erro QA'};
for(const f of ['anamnesis-schema.js','portal-model.js','portal-views.js','portal-app.js'])w.eval(read(f));
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,0));};
const el=s=>{const n=w.document.querySelector(s);assert.ok(n,'Missing '+s);return n;};
await settle();assert.equal(w.document.querySelectorAll('.anam-section').length,7);assert.equal(el('[name="full_name"]').value,profile.full_name);
for(const f of w.LG_ANAM.fields){const input=el('[name="'+f.key+'"]');input.value=f.type==='number'?f.key==='meals_per_day'?'4':f.key==='height_cm'?'170':f.key==='weight_kg'?'70':'1.5':f.type==='date'?'1990-01-01':f.type==='select'?f.options[0]:'QA '+f.key;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
for(let i=0;i<7;i++)el('[name="parq_'+i+'"]').value='no';el('[name="reviewed"]').checked=true;
el('#anamForm button[type="submit"]').click();await settle();assert.equal(writes,1);assert.equal(stored.student_id,profile.id);assert.equal(Object.keys(stored.answers).length,49);assert.equal(stored.answers.questionnaire_version,2);assert.match(el('[data-form-status]').textContent,/salva e disponível/);
const navigate=async key=>{el('[data-page="'+key+'"]').click();await settle();};
await navigate('history');await navigate('anamnesis');assert.equal(el('[name="surgeries"]').value,'QA surgeries');assert.equal(el('[name="water_liters"]').value,'1.5');
el('[name="surgeries"]').value='';el('[name="reviewed"]').checked=true;el('#anamForm button[type="submit"]').click();await settle();assert.equal(stored.answers.surgeries,null);assert.equal(writes,2);
const newRecord=structuredClone(stored);
stored={id:'legacy-qa',student_id:profile.id,updated_at:'2026-10-01',training_goal:'Legacy objective',medical_conditions:'Legacy clinical note',profession_routine:'Legacy routine',sleep_hours:8,answers:{legacy_note:'KEEP'},parq_answers:Object.fromEntries(Array.from({length:7},(_,i)=>['q'+(i+1),{answer:'no'}]))};
await navigate('history');await navigate('anamnesis');assert.equal(el('[name="medical_conditions"]').value,'Legacy clinical note');assert.equal(el('[name="experience_level"]').value,'');el('[name="reviewed"]').checked=true;el('#anamForm button[type="submit"]').click();await settle();assert.equal(stored.medical_conditions,'Legacy clinical note');assert.equal(stored.answers.legacy_note,'KEEP');
await w.happyDOM.close();

const t=new Window({url:'https://example.test/admin.html',settings});t.document.write(read('admin.html').replace(/<script\b[\s\S]*?<\/script>/g,''));
const teacherClient={rpc:async()=>({data:[]}),from(table){const q={select(){return this;},eq(){return this;},order(){return this;},then(resolve,reject){return Promise.resolve({data:table==='profiles'?[profile]:table==='anamneses'?[newRecord]:[]}).then(resolve,reject);}};return q;}};
t.LG_AUTH={createClient:()=>teacherClient};t.eval(read('anamnesis-schema.js'));
const inline=[...read('admin.html').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(x=>!x[1].includes('src='))[2];
t.eval(inline.replace('boot();','').replace('const sb=','var sb=').replace('const esc=','var esc=').replace('let me=null,students=[]','var me=null,students=[]')+'\nme={id:"qa-teacher",full_name:"Professor QA"};');t.eval(read('student-management.js'));
await t.openStudentHub(profile.id,'anam');const report=t.document.querySelector('#studentHubBody');assert.equal(report.querySelectorAll('.anam-section').length,8);assert.match(report.textContent,/QA body_priorities/);assert.match(report.textContent,/QA attendance_barriers/);assert.match(report.textContent,/170 cm/);assert.match(report.textContent,/Não informado/);
console.log('PASS: 48-field student save/read/edit, own linkage, decimal units, explicit clear, legacy preservation and seven-group teacher panel plus PAR-Q');
await t.happyDOM.close();
