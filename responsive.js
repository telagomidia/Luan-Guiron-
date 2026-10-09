/* Contain wide data tables locally, including those rendered after navigation. */
(() => {
 'use strict';
 function containTables(root){
  const tables=root.matches?.('table')?[root]:[...(root.querySelectorAll?.('table')||[])];
  for(const table of tables){
   if(table.closest('.table-wrap,.table-scroll'))continue;
   const wrapper=document.createElement('div');
   wrapper.className='table-scroll';wrapper.tabIndex=0;
   wrapper.setAttribute('role','region');
   wrapper.setAttribute('aria-label','Tabela — deslize para consultar todas as colunas');
   table.before(wrapper);wrapper.append(table);
  }
 }
 function start(){
  containTables(document.body);
  new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)containTables(node);
  }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
