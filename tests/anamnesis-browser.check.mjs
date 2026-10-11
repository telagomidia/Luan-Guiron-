// Chromium: real modal timing, failure recovery, local print view and A4 pagination.
// All answers below are synthetic. Never export a real student's health data for QA.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8');
const output=process.env.MOBILE_SCREENSHOTS||'/tmp/mobile-layout-screenshots';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.route('**/*',route=>{const url=new URL(route.request().url()),file=url.pathname.split('/').pop();return route.fulfill({contentType:file.endsWith('.css')?'text/css':'image/webp',body:file.endsWith('.css')?read(file):fs.readFileSync(new URL('public/logo-lg.webp',root))});});
  await page.setContent(read('portal.html').replace(/<script\b[\s\S]*?<\/script>/g,'').replace('<head>','<head><base href="http://qa.test/">'),{waitUntil:'load'});
  for(const file of ['anamnesis-schema.js','portal-model.js','portal-views.js'])await page.addScriptTag({content:read(file)});
  await page.evaluate(()=>{
   const profile={id:'qa',full_name:'Aluno sintético QA',role:'student',active:true};
   window.qa={writes:0,fail:true,savedAt:0};
   const api={profile:async()=>profile,plans:async()=>[],sessions:async()=>[],assessments:async()=>[],anamnesis:async()=>({id:'qa-anam',student_id:'qa',training_goal:'Objetivo sintético QA',parq_answers:Object.fromEntries(Array.from({length:7},(_,i)=>['q'+(i+1),{answer:'no'}]))}),saveAnam:async()=>{qa.writes++;await new Promise(r=>setTimeout(r,150));if(qa.fail)throw new Error('Falha QA');qa.savedAt=performance.now();return{id:'qa-anam',student_id:'qa'};}};
   window.LG_AUTH={createClient:()=>({}),access:async()=>({user:{id:'qa'},profile}),sessionExpired:()=>false,message:()=> 'Falha QA'};
   window.LG_PORTAL={...LG_PORTAL,createApi:()=>api};
  });
  await page.addScriptTag({content:read('portal-app.js')});await page.locator('[data-page="anamnesis"]').click();await page.locator('[name="reviewed"]').check();
  await page.locator('#anamForm button[type="submit"]').click();await page.locator('[data-form-status].error').waitFor();assert.equal(await page.locator('.anam-saved').count(),0);assert.equal(await page.locator('[name="training_goal"]').inputValue(),'Objetivo sintético QA');
  await page.evaluate(()=>qa.fail=false);await page.locator('#anamForm button[type="submit"]').click();
  assert.equal(await page.locator('.anam-saved').count(),0,'No success before database confirmation');
  await page.locator('.anam-saved[open]').waitFor();assert.equal(await page.locator('#anamSavedTitle').textContent(),'Anamnese salva');
  await page.evaluate(()=>document.querySelector('#anamForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(await page.evaluate(()=>qa.writes),2,'No repeated writes during modal');
  const box=await page.locator('.anam-saved').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'Success modal fits '+width);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.anam-saved[open]').count(),1);
  if(width===390)await page.screenshot({path:path.join(output,'anamnesis-saved-mobile.png')});
  await page.waitForFunction(()=>location.hash==='#home');assert.ok(await page.evaluate(()=>performance.now()-qa.savedAt>=3000),'Return starts after 3 seconds');assert.equal(await page.locator('.anam-saved').count(),0);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage();
 await context.addInitScript(()=>{window.printCalls=0;window.print=()=>window.printCalls++;});
 await page.route('**/*',route=>route.fulfill({contentType:'image/webp',body:fs.readFileSync(new URL('public/logo-lg.webp',root))}));
 await page.goto('http://qa.test/admin.html');await page.setContent('<!doctype html><html><head></head><body><button id="export">Exportar</button></body></html>');
 for(const f of ['anamnesis-schema.js','anamnesis-pdf.js'])await page.addScriptTag({content:read(f)});
 await page.evaluate(()=>{
  window.qaStudent={id:'qa',full_name:'Aluno sintético QA'};
  window.qaRow={student_id:'qa',updated_at:'2026-10-01T12:00:00Z',answers:{questionnaire_version:2,...Object.fromEntries(LG_ANAM.fields.map(f=>[f.key,f.type==='number'?f.key==='height_cm'?170:f.key==='weight_kg'?70:4:f.type==='date'?'1990-01-01':f.type==='select'?f.options[0]:'Resposta sintética '+f.key]))},parq_answers:Object.fromEntries(Array.from({length:7},(_,i)=>['q'+(i+1),{answer:i===0?'yes':'no'}]))};
  document.querySelector('#export').onclick=()=>LG_ANAM_PDF.open(qaRow,qaStudent);
 });
 const opened=context.waitForEvent('page');await page.locator('#export').click();const popup=await opened;await popup.waitForFunction(()=>printCalls===1);assert.equal(await popup.evaluate(()=>opener),null);assert.equal(await popup.locator('.anam-section').count(),8);await popup.locator('#printPdf').click();assert.equal(await popup.evaluate(()=>printCalls),2);await popup.close();
 for(const variant of ['standard','long']){
  const html=await page.evaluate(variant=>{const row=structuredClone(qaRow);if(variant==='long')row.answers.additional_notes=('Informação sintética de rotina, preferências e acompanhamento. '.repeat(75)+' FIM DA RESPOSTA LONGA');return LG_ANAM_PDF.build(row,qaStudent,{logo:'http://qa.test/logo.webp',now:new Date('2026-10-11T12:00:00Z')});},variant);
  const report=await context.newPage();await report.setContent(html,{waitUntil:'load'});await report.emulateMedia({media:'print'});
  const overflow=await report.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  const pdf=path.join(output,'anamnesis-'+variant+'.pdf');await report.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
  const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});for(const key of ['Aluno sintético QA','Identificação','Histórico de treinamento','Objetivos','Saúde, dores e lesões','Rotina','Alimentação e hábitos','Preferências e aderência','PAR-Q','Documento confidencial'])assert.ok(text.includes(key),key+' present in '+variant+' PDF');assert.ok(!text.includes('Salvar / imprimir PDF'));if(variant==='long')assert.ok(text.includes('FIM DA RESPOSTA LONGA'));
  const pages=text.split('\f').filter(x=>x.trim());assert.ok(pages.length>=2&&pages.length<12,'Reasonable page count: '+pages.length);assert.ok(pages.every(x=>x.trim().length>100),'No near-empty pages');
  execFileSync('pdftoppm',['-scale-to','1200','-png',pdf,path.join(output,'anamnesis-'+variant)]);
  console.log('PASS: '+variant+' PDF, '+pages.length+' A4 pages, complete text, no toolbar, rendered PNGs');await report.close();
 }
 await context.close();console.log('PASS: save failure/retry, no premature success, duplicate protection, modal fit, Escape handling and actual 3-second return at 320/390/768/1440px; both PDF print actions.');
}finally{await browser.close();}
