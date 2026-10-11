const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function model(extra={}){const window={};const context=vm.createContext({window,Date,URL,...extra});for(const f of ['anamnesis-schema.js','anamnesis-pdf.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);context.LG_ANAM=window.LG_ANAM;return {pdf:window.LG_ANAM_PDF,window};}
const student={id:'qa',full_name:'Aluno sintético QA'};
test('PDF contains every question and PAR-Q with LG brand, dates and units',()=>{
 const {pdf,window}=model();const answers=Object.fromEntries(window.LG_ANAM.fields.map(f=>[f.key,f.type==='number'?f.key==='water_liters'?1.5:170:f.type==='date'?'1990-01-01':'RESPOSTA '+f.key]));
 const row={student_id:'qa',updated_at:'2026-10-01T12:00:00Z',answers,parq_answers:{q1:{answer:'yes'},q2:{answer:'no'}}};const html=pdf.build(row,student,{now:new Date('2026-10-11T12:00:00Z')});
 for(const f of window.LG_ANAM.fields)assert.ok(html.includes(f.label.replace(/&/g,'&amp;')));assert.match(html,/LG · LUAN GUIRON/);assert.match(html,/PAR-Q/);assert.match(html,/170 cm/);assert.match(html,/1.5 L/);assert.match(html,/01\/10\/2026/);assert.match(html,/11\/10\/2026/);assert.match(html,/Não informado/);assert.match(html,/Documento confidencial/);
});
test('PDF preserves legacy answers and escapes student and clinical content',()=>{
 const {pdf}=model();const html=pdf.build({student_id:'qa',training_goal:'<script>alert(1)</script>',answers:{medical_conditions:'<img src=x onerror=alert(1)>'}}, {...student,full_name:'<b>QA</b>'});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;b&gt;QA/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img src=x/);
});
test('PDF cannot silently export a different student or missing anamnesis',()=>{const {pdf}=model();assert.throws(()=>pdf.build({student_id:'other'},student));assert.throws(()=>pdf.build(null,student));});
test('Blocked pop-up explains how to enable export',()=>{let message;const {pdf,window}=model({location:{href:'https://example.test/admin.html'},toast:v=>message=v});window.open=()=>null;assert.equal(pdf.open({student_id:'qa'},student),false);assert.match(message,/Permita pop-ups/);});
