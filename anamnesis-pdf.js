/* Private, local print view. Uses the same questionnaire and answers as the teacher view. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toLocaleString('pt-BR'):'Não informado';};
 function build(row,student,{logo='',now=new Date()}={}){
  if(!row||!student?.id||row.student_id!==student.id)throw new Error('Anamnese não corresponde ao aluno.');
  const name=student.full_name||'Aluno';
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anamnese LG - '+esc(name)+'</title><style>'+ 
   '@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;font:11pt/1.45 Arial,sans-serif;color:#211a29;background:#fff}.sheet{max-width:180mm;margin:24px auto;padding:0 16px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;border-bottom:3px solid #7135e8;padding-bottom:14px}.brand{font-size:19pt;font-weight:800}.subtitle,.muted,.meta{color:#62596c}.logo{width:64px;height:64px;object-fit:contain}h1{font-size:24pt;margin:22px 0 6px;overflow-wrap:anywhere}.meta{font-size:10pt}.anam-section{margin-top:24px}.anam-section h2{font-size:14pt;color:#6530c6;border-bottom:1px solid #d8cdeb;padding-bottom:7px;break-after:avoid}.student-grid{display:block}.student-value{padding:9px 0;border-bottom:1px solid #e8e2ed;overflow-wrap:anywhere}.student-value small{display:block;font-size:10pt;font-weight:700;color:#50465a;margin-bottom:4px;break-after:avoid}.student-value div{orphans:3;widows:3}.footer{margin-top:26px;padding-top:12px;border-top:2px solid #7135e8;font-size:9pt;color:#62596c;break-inside:avoid}.no-print{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:20px;font-size:10pt}button{padding:12px 18px;color:#fff;background:#6530c6;border:0;border-radius:6px;font-weight:700;cursor:pointer}button:focus-visible{outline:3px solid #211a29;outline-offset:3px}@media(max-width:500px){.sheet{margin:16px auto}.brand{font-size:15pt}.logo{width:52px;height:52px}}@media print{.sheet{max-width:none;margin:0;padding:0}.no-print{display:none}.top,h1,.meta{break-inside:avoid}h1{break-after:avoid}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'+
   '</style></head><body><main class="sheet"><div class="no-print"><button id="printPdf" type="button">Salvar / imprimir PDF</button><span>Na impressão, escolha “Salvar como PDF”.</span></div><header class="top"><div><div class="brand">LG · LUAN GUIRON</div><div class="subtitle">Treinamento Personalizado</div></div>'+(logo?'<img class="logo" src="'+esc(logo)+'" alt="Logo LG">':'')+'</header><h1>Anamnese</h1><div class="meta"><strong>Aluno:</strong> '+esc(name)+'<br><strong>Última atualização:</strong> '+esc(date(row.updated_at||row.created_at))+'<br><strong>Emitido em:</strong> '+esc(date(now))+'</div>'+LG_ANAM.report(row,student)+'<footer class="footer">LG · Luan Guiron · Treinamento Personalizado<br>Informações fornecidas pelo aluno para acompanhamento profissional. Documento confidencial.</footer></main></body></html>';
 }
 function open(row,student){
  const html=build(row,student,{logo:new URL('./public/logo-lg.webp',location.href).href});
  const popup=window.open('','_blank');
  if(!popup){if(typeof toast==='function')toast('Permita pop-ups para gerar o PDF da anamnese.');return false;}
  popup.opener=null;
  popup.document.open();popup.document.write(html);popup.document.close();
  let ready=false;
  const print=()=>{if(ready||popup.closed)return;ready=true;popup.focus();popup.print();};
  popup.document.querySelector('#printPdf').onclick=()=>{popup.focus();popup.print();};
  const image=popup.document.querySelector('.logo');
  if(image&&!image.complete){image.addEventListener('load',print,{once:true});image.addEventListener('error',print,{once:true});}else popup.setTimeout(print,100);
  popup.setTimeout(print,4000);
  return true;
 }
 window.LG_ANAM_PDF=Object.freeze({build,open});
})();
