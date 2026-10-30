import fs from 'node:fs';import assert from 'node:assert/strict';
const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
const w=new Window({settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
w.document.write('<main id="view"></main>');
let failTable='',assessments=[];w.view=w.document.querySelector('#view');w.students=[{id:'s1',full_name:'Aluno QA',active:true}];w.loadStudents=async()=>{};w.toast=()=>{};
w.esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.LG_ANAM={value:()=>''};w.sb={from(table){const q={select(){return q},order(){return q},then(resolve){resolve(table===failTable?{error:{message:'database unavailable'},data:null}:{data:table==='assessments'?assessments:[]})}};return q}};
w.eval(fs.readFileSync(new URL('../student-management.js',import.meta.url),'utf8'));
for(const table of ['anamneses','assessments','training_plans','workout_sessions','student_followups']){
 failTable=table;await w.openStudentHub('s1');assert.match(w.view.textContent,/Histórico indisponível/);assert.ok(w.document.querySelector('#retryStudentHub'));assert.doesNotMatch(w.view.textContent,/Pendente|Sem plano ativo|Nenhuma avaliação registrada/);
}
failTable='';await w.openStudentHub('s1');assert.match(w.view.textContent,/Pendente/);assert.match(w.view.textContent,/Sem plano ativo/);
assessments=[{student_id:'s1',assessed_at:'2026-10-30',protocol:'<img src=x onerror=bad()>',weight_kg:70}];await w.openStudentHub('s1','evo');assert.equal(w.view.querySelector('img'),null);assert.match(w.view.textContent,/<img src=x onerror=bad\(\)>/);
let release,calls=0;w.students.push({id:'s2',full_name:'Aluno Dois',active:true});
w.loadStudents=()=>++calls===1?new Promise(resolve=>release=resolve):Promise.resolve();
const slow=w.openStudentHub('s1');await w.openStudentHub('s2');release();await slow;assert.match(w.view.querySelector('h1').textContent,/ALUNO DOIS/);
let late;w.loadStudents=()=>new Promise(resolve=>late=resolve);const departed=w.openStudentHub('s1');w.view._studentHubTicket=null;w.view.innerHTML='<h1>OUTRA TELA</h1>';late();await departed;assert.match(w.view.textContent,/OUTRA TELA/);
console.log('PASS: all five query failures visible; empty history only after successful queries');await w.happyDOM.close();
