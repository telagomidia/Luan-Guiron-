import fs from 'node:fs';import assert from 'node:assert/strict';const {Window}=await import(process.env.HAPPY_DOM_ENTRY||'happy-dom');
for(const fail of [false,true]){
 const w=new Window({url:'https://example.test/admin.html',settings:{disableJavaScriptFileLoading:true}});w.document.write('<main></main>');
 const scripts=[];const append=w.document.body.appendChild.bind(w.document.body);w.document.body.appendChild=node=>{if(node.tagName==='SCRIPT'){scripts.push(node.src);queueMicrotask(()=>fail?node.onerror():node.onload());return node;}return append(node)};
 w.eval(fs.readFileSync(new URL('../config.js',import.meta.url),'utf8'));const result=w.LG_ADMIN_READY.then(()=>true,error=>error);
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));const outcome=await result;
 if(fail){assert.ok(outcome instanceof w.Error);assert.match(outcome.message,/carregar o painel/);assert.equal(scripts.length,1);}else{assert.equal(outcome,true);assert.equal(scripts.length,10);assert.match(scripts[0],/student-management/);assert.match(scripts[1],/student-removal/);}
 await w.happyDOM.close();
}
console.log('PASS: required modules load in declared order; failed module rejects boot without fallback');
