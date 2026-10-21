// Synthetic records only; no real accounts, credentials or network requests.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {Window} = await import(process.env.HAPPY_DOM_ENTRY || 'happy-dom');
const w = new Window({url:'https://example.test/admin.html',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
w.document.write('<nav id="nav"><button class="active" data-page="Alunos">Alunos</button></nav><main id="view"></main>');
const records = [
  {id:'s1',role:'student',full_name:'<img src=x> Aluno',email:'one@example.invalid',active:true},
  {id:'s2',role:'student',full_name:'Oculto',email:'two@example.invalid',active:false},
  {id:'s3',role:'student',full_name:'Prazo encerrado',email:'three@example.invalid',active:true}
];
const archives = new Map([['s2',new Date(Date.now()+86400000).toISOString()],['s3',new Date(Date.now()-1000).toISOString()]]);
let calls=[], fail=false, pending;
const client = {
  from(table) {
    let id, removal=false;
    const q = {select(){return q},eq(key,value){if(key==='student_id')id=value;return q},order(){return q},delete(){removal=true;return q},then(resolve){
      if(removal){archives.delete(id);return resolve({data:[{student_id:id}]});}
      const data=table==='student_list_archives'?[...archives].map(([student_id,hidden_until])=>({student_id,hidden_until})):[];
      return resolve({data});
    }}; return q;
  },
  async rpc(name,body) {calls.push({name,body});if(fail)return {error:{}};const until=new Date(Date.now()+body.p_days*86400000).toISOString();archives.set(body.p_student_id,until);return {data:until};},
  functions:{invoke:async(name,body)=>{calls.push({name,...body});if(pending)await pending;if(fail)return {error:{context:{json:async()=>({error:'Vínculo financeiro pendente.'})}}};records.splice(records.findIndex(row=>row.id===body.body.id),1);return {data:{ok:true}};}}
};
w.sb=client;w.view=w.document.querySelector('#view');w.students=records;w.me={id:'trainer'};
w.loadStudents=async()=>records;w.esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.toast=()=>{};w.copyStudentSignupLink=()=>{};w.openStudentHub=()=>{};w.studentForm=()=>{};
w.eval(fs.readFileSync(new URL('../student-removal.js',import.meta.url),'utf8'));
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const click=selector=>w.document.querySelector(selector).click();
const input=(selector,value)=>{const field=w.document.querySelector(selector);field.value=value;field.dispatchEvent(new w.Event('input'));};
await w.alunos();
assert.equal(w.document.querySelectorAll('.student-card').length,2);
assert.equal(w.document.querySelector('.student-card img'),null);
assert.match(w.document.querySelector('[data-filter="hidden"]').textContent,/1/);
click('[data-filter="hidden"]');assert.equal(w.document.querySelectorAll('.student-card').length,1);
assert.equal(w.document.querySelector('.student-card').dataset.studentId,'s2');
click('[data-action="restore"]');await settle();assert.equal(archives.has('s2'),false);
click('[data-filter="all"]');assert.equal(w.document.querySelectorAll('.student-card').length,3);
w.deleteStudent('s1');click('[data-temporary]');
for(const bad of ['0','-1','1.5','3651','']){input('#studentHideDays',bad);assert.equal(w.document.querySelector('[data-save]').disabled,true);}
input('#studentHideDays','7');click('[data-save]');await settle();
assert.equal(calls[0].body.p_days,7);assert.equal(w.document.querySelectorAll('.student-card').length,2);assert.equal(records[0].active,true);
// Failure leaves dialog open with feedback and no false success.
w.deleteStudent('s2');click('[data-temporary]');fail=true;click('[data-save]');await settle();assert.equal(w.document.querySelector('dialog').open,true);assert.match(w.document.querySelector('dialog [role="status"]').textContent,/Não foi possível/);click('[data-cancel]');fail=false;
w.deleteStudent('s1');click('[data-permanent]');
for(const bad of ['excluir','EXCLUIR PERMANENTEMENTE','excluir permanentemente ']){input('#studentDeleteConfirmation',bad);assert.equal(w.document.querySelector('[data-save]').disabled,true);}
input('#studentDeleteConfirmation','excluir permanentemente');fail=true;click('[data-save]');await settle();assert.match(w.document.querySelector('dialog [role="status"]').textContent,/Vínculo financeiro/);assert.equal(w.document.querySelector('[data-save]').disabled,false);fail=false;
let release;pending=new Promise(resolve=>release=resolve);click('[data-save]');click('[data-save]');await settle();assert.equal(w.document.querySelector('[data-close]').disabled,true);release();await settle();assert.equal(records.some(row=>row.id==='s1'),false);
assert.equal(calls.filter(call=>call.name==='delete-student').length,2); // one failed, one successful; double click ignored
assert.equal(calls.at(-1).body.confirmation,'excluir permanentemente');
// Expiration is re-evaluated on redraw, without changing the profile.
archives.set('s2',new Date(Date.now()+40).toISOString());await w.alunos();await new Promise(resolve=>setTimeout(resolve,150));assert.equal(w.document.querySelectorAll('.student-card').length,2);
// Explicit list navigation also works after creating a student on Dashboard.
w.document.querySelector('#nav button').dataset.page='Dashboard';await w.alunos();assert.ok(w.document.querySelector('#studentList'));
// A late response cannot replace another navigation target.
const late=w.alunos();w.document.querySelector('#nav button').dataset.page='Treinos';w.document.querySelector('#nav button').className='active';w.view.innerHTML='<h1>Outra tela</h1>';await late;assert.equal(w.view.textContent,'Outra tela');
await w.happyDOM.close();
console.log('PASS: visible/hidden lists, expiry, restore, escaping, duration validation, confirmation, errors, double-click and navigation guards');
