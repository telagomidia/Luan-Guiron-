// Real Chromium layout tests. Auth/data are not used; all contents are synthetic.
// PLAYWRIGHT_ENTRY=/path/to/playwright/index.mjs node tests/responsive-browser.check.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_ENTRY||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const screenshots=process.env.MOBILE_SCREENSHOTS||'/tmp/mobile-layout-screenshots';
fs.mkdirSync(screenshots,{recursive:true});
const read=f=>fs.readFileSync(root+f,'utf8');
const noScripts=html=>html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace('<head>','<head><base href="http://layout.test/">');
const buttons=['Dashboard','Alunos','Avaliações','Treinos','Anamneses','Evolução','Orientações'];
const long='Bloco inicial — adaptação técnica e recomposição corporal com progressão individualizada';
const text='Informações e orientações do acompanhamento. '.repeat(8);
const table='<table><thead><tr>'+['Estágio','Velocidade (km/h)','FC segundo minuto','FC terceiro minuto','Repetições realizadas','Carga (kg)','Observações completas'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody><tr>'+Array(7).fill('<td>'+long+'</td>').join('')+'</tr></tbody></table>';
function fixture(){return '<div class="student-hub-head"><div><h1>ALUNO DE TESTE COM NOME COMPRIDO.</h1><p class="muted">'+('email-comprido'.repeat(7))+'@example.invalid</p></div><div class="report-actions"><button class="ghost">Editar cadastro</button><button class="ghost">Definir / redefinir senha</button></div></div><div class="student-overview">'+['Anamnese','Última avaliação','Treino atual'].map(x=>'<div class="card"><div class="ey">'+x+'</div><h2>'+long+'</h2></div>').join('')+'</div><div class="attention-panel"><h3>Pontos para sua revisão profissional <span class="attention-count">1</span></h3><div class="attention-item">Anamnese pendente</div><p class="muted">'+text+'</p></div><div class="student-hub-tabs">'+['Visão geral','Anamnese','Avaliações','Evolução','Treinos','Histórico'].map(x=>'<button class="ghost">'+x+'</button>').join('')+'</div><div class="student-grid">'+['Dados principais','Situação atual'].map(x=>'<section class="student-section"><h2>'+x+'</h2><div class="student-value"><small>Objetivo</small>'+text+'</div><div class="student-value">'+long+'</div></section>').join('')+'</div><div class="toolbar"><h2>Exercícios e sessões</h2><div class="report-actions"><button class="primary">+ Adicionar exercício ao treino</button><button class="ghost">Editar</button><button class="ghost">Excluir</button></div></div><div class="row"><div><b>'+long+'</b><small>'+text+'</small></div><div class="report-actions"><button class="primary">Ver avaliação completa</button><button class="ghost">Gerar ficha PDF</button></div></div>'+table;}
const browser=await chromium.launch({headless:true});
let count=0;
try{
 for(const width of [320,390,430,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});const page=await context.newPage();
  await page.route('**/*',route=>{const url=new URL(route.request().url());return route.fulfill({status:200,contentType:url.pathname.endsWith('.css')?'text/css':'image/svg+xml',body:url.pathname.endsWith('/responsive.css')?read('responsive.css'):url.pathname.endsWith('/portal.css')?read('portal.css'):'<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="white"/></svg>'});});
  async function fits(label){
   await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,body:document.body.scrollWidth,mainRight:document.querySelector('main').getBoundingClientRect().right}));
   assert.ok(result.width<=width+1&&result.body<=width+1&&result.mainRight<=width+1,label+' @'+width+' overflow '+JSON.stringify(result));count++;
  }
  for(const name of ['index','cadastro','senha','ativar-admin','portal','admin']){
   await page.setContent(noScripts(read(name+'.html')),{waitUntil:'load'});
   if(name==='admin'){
    // Same styles as late-loaded dashboard extensions, after the responsive sheet.
    for(const f of ['student-management.js','student-alerts.js'])await page.addStyleTag({content:read(f).match(/const css=`([\s\S]*?)`;/)[1]});
    await page.locator('#nav').evaluate((nav,labels)=>nav.innerHTML=labels.map(x=>'<button>'+x+'</button>').join(''),buttons);
    await page.locator('#view').evaluate((view,html)=>view.innerHTML=html,fixture());
   }
   if(name==='portal'){
    await page.locator('#studentNav').evaluate(nav=>nav.innerHTML=['Início','Meu treino','Histórico','Avaliações','Evolução','Anamnese','Orientações','Perfil'].map(x=>'<button>'+x+'</button>').join(''));
    await page.locator('#content').evaluate((view,html)=>view.innerHTML='<h1>Meu acompanhamento</h1><div class="cards">'+Array(3).fill('<div class="panel">'+html+'</div>').join('')+'</div>',long);
   }
   await page.addScriptTag({content:read('responsive.js')});
   await fits(name);
   if(name==='cadastro'){
    // All onboarding steps, including PAR-Q, not only the first visible step.
    const total=await page.locator('.page').count();
    for(let i=0;i<total;i++){await page.locator('.page').evaluateAll((pages,n)=>pages.forEach((p,j)=>p.classList.toggle('on',j===n)),i);await fits('cadastro step '+i);}
   }
   if(name==='index'){
    await page.locator('#loginModal').evaluate(dialog=>dialog.showModal());
    const box=await page.locator('.login-box').boundingBox();assert.ok(box.width>200&&box.x>=0&&box.x+box.width<=width+1,'Login dialog fit');count++;
   }
   if(name==='admin'){
    assert.equal(await page.locator('.table-scroll table').count(),1);
    if(width<=560){const cols=await page.locator('.student-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns);assert.ok(!cols.includes(' '),'Student profile must have one column');}
    if(width===390)await page.screenshot({path:path.join(screenshots,'admin-mobile.png'),fullPage:true});
    await page.locator('#form').evaluate((form,html)=>form.innerHTML='<div class="form"><div class="field"><label>Nome completo</label><input value="Aluno QA"></div><div class="field"><label>Treino</label><select><option>'+html+'</option></select></div><div class="field full"><label>Observação</label><textarea></textarea></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px"><input><input><input></div><div class="actions"><button class="ghost">Cancelar</button><button class="primary">Salvar avaliação completa</button></div>',long);
    await page.locator('#modal').evaluate(dialog=>dialog.showModal());
    const modal=await page.locator('#modal').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,right:el.getBoundingClientRect().right,left:el.getBoundingClientRect().left}));assert.ok(modal.scroll<=modal.width+1&&modal.right<=width+1&&modal.left>=0,'Admin dialog overflow '+JSON.stringify(modal));count++;
   }
  }
  await context.close();
 }
 console.log('PASS: '+count+' Chromium layout checks at 320/390/430/768/1440px; six pages, all onboarding steps, login/profile dialogs, late-loaded profile CSS and contained tables.');
}finally{await browser.close();}
