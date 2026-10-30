const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
test('actual assessment UI handler submits VO2 test and stages without reading unsaved assessment',async()=>{
 const src=fs.readFileSync(__dirname+'/../admin.html','utf8').split('\n').find(s=>s.startsWith('const assessmentSaveId='));assert.ok(src);
 const submit=src.slice(0,src.lastIndexOf(';modal.showModal()')),actions=[],button={disabled:false},field={value:'',textContent:'Estável'};
 const row={querySelector:s=>s==='[data-v="speed"]'?{value:'5'}:field};
 const form={elements:{vo2max_ml_kg_min:{value:'30'}},querySelector:()=>button,querySelectorAll:s=>s==='.vo2-stage'?[row]:[]};
 const context={form,FormData:class{*[Symbol.iterator](){yield['student_id','s1'];yield['composition_method','bioimpedance']}},crypto:webcrypto,editId:null,me:{id:'trainer'},sb:{},LG_ASSESSMENT:{async save(client,payload){actions.push(payload);return{id:payload.id}}},avaliacoes:async()=>{},assessmentReport:()=>{},modal:{close(){}},toast:m=>actions.push(m),console:{error(){}}};
 vm.createContext(context);vm.runInContext(submit,context);await form.onsubmit({preventDefault(){}});
 assert.equal(actions.length,2);assert.equal(actions[0].vo2.speed_kmh,'5');assert.equal(actions[0].vo2.vo2max_ml_kg_min,'30');assert.equal(actions[0].stages.length,1);assert.equal(actions[1],'Avaliação completa salva');
});
