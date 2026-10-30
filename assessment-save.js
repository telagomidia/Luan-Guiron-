/* Validate first; immutable uploads precede one atomic, RLS-protected DB operation. */
(() => {
 'use strict';
 const MAX_BYTES=10*1024*1024;
 const photoTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 function validateFiles(pdf,photos){
  if(pdf){if(pdf.type!=='application/pdf')throw Error('O relatório precisa ser um PDF');if(pdf.size>MAX_BYTES)throw Error('O PDF deve ter no máximo 10 MB');}
  for(const {file,view} of photos){
   if(!['front','back','side','left','right'].includes(view))throw Error('Posição da foto inválida');
   if(!photoTypes[file.type])throw Error('Foto em formato não permitido');
   if(file.size>MAX_BYTES)throw Error('Cada foto deve ter no máximo 10 MB');
  }
 }
 async function save(client,input){
  const {id,assessment,pdf,photos=[]}=input;
  validateFiles(pdf,photos);
  const batch=crypto.randomUUID(),base=assessment.student_id+'/'+id+'/'+batch;
  const uploaded=[],rows=[],record={...assessment};
  // Upload errors are definitive: clean only paths from this attempt. Old files stay intact.
  const upload=async(bucket,path,file)=>{const result=await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(result.error)throw result.error;uploaded.push({bucket,path});};
  try{
   if(pdf){record.bioimpedance_pdf_path=base+'/bioimpedancia.pdf';await upload('assessment-documents',record.bioimpedance_pdf_path,pdf);}
   for(const photo of photos){const path=base+'/'+photo.view+'.'+photoTypes[photo.file.type];await upload('progress-photos',path,photo.file);rows.push({view:photo.view,storage_path:path});}
  }catch(error){await Promise.allSettled(uploaded.map(x=>client.storage.from(x.bucket).remove([x.path])));throw error;}
  // Do not delete uploads after an ambiguous RPC/network result: the transaction may have committed.
  // Reusing this id updates the same assessment on retry; orphan cleanup can run after reconciliation.
  const {data,error}=await client.rpc('save_assessment_atomic',{p_id:id,p_editing:input.editing,p_assessment:record,p_circumferences:input.circumferences,p_skinfolds:input.skinfolds,p_strength:input.strength,p_vo2:input.vo2,p_stages:input.stages,p_photos:rows});
  if(error)throw error;
  if(data?.id!==id)throw Error('Não foi possível confirmar a avaliação. Reabra a lista antes de repetir.');
  return data;
 }
 window.LG_ASSESSMENT=Object.freeze({save,validateFiles});
})();
