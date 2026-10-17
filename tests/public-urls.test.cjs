const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function load(href){
  const url=new URL(href),listeners=[];
  const context={URL,location:{href:url.href,pathname:url.pathname},addEventListener:(name,handler)=>listeners.push([name,handler])};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname+'/../config.js','utf8'),context);
  return{urls:context.window.LG_URLS,listeners};
}

test('custom domain extensionless admin resolves signup at site root',()=>{
  const {urls,listeners}=load('https://luanguiron.com.br/admin');
  assert.equal(urls.signup(),'https://luanguiron.com.br/cadastro');
  assert.equal(urls.password(),'https://luanguiron.com.br/senha');
  assert.equal(urls.login(),'https://luanguiron.com.br/');
  assert.equal(urls.portal(),'https://luanguiron.com.br/portal');
  assert.equal(urls.isAdmin(),true);
  assert.equal(listeners.some(([name])=>name==='load'),true);
});

test('GitHub Pages panel still shares the canonical custom domain',()=>{
  const {urls,listeners}=load('https://telagomidia.github.io/Luan-Guiron-/admin.html');
  assert.equal(urls.signup(),'https://luanguiron.com.br/cadastro');
  assert.equal(urls.isAdmin(),true);
  assert.equal(listeners.some(([name])=>name==='load'),true);
});

test('non-admin pages do not load trainer modules',()=>{
  const {urls,listeners}=load('https://luanguiron.com.br/cadastro');
  assert.equal(urls.isAdmin(),false);
  assert.equal(listeners.length,0);
});


test('admin publishes the current student history calendar assets',()=>{
  const admin=fs.readFileSync(__dirname+'/../admin.html','utf8');
  const config=fs.readFileSync(__dirname+'/../config.js','utf8');
  const management=fs.readFileSync(__dirname+'/../student-management.js','utf8');
  assert.match(admin,/config\.js\?v=8/);
  assert.match(admin,/trainer-journal\.js\?v=4/);
  assert.match(config,/student-management\.js\?v=9/);
  assert.match(management,/LG_TRAINER_JOURNAL\.mount\(box\.querySelector\('#studentWorkoutJournal'\),sb,id\)/);
});

test('every page publishes the official LG favicon',()=>{
  const pages=['index.html','admin.html','portal.html','senha.html','cadastro.html','ativar-admin.html'];
  const favicon='<link rel="icon" type="image/png" sizes="512x512" href="./public/favicon-lg.png?v=1">';
  for(const page of pages){
    const html=fs.readFileSync(__dirname+'/../'+page,'utf8');
    assert.equal(html.includes(favicon),true,page+' must use the official LG favicon');
    assert.doesNotMatch(html,/public\/(?:favicon\.svg|logo-lg-official\.svg)/);
  }

  const icon=fs.readFileSync(__dirname+'/../public/favicon-lg.png');
  assert.equal(icon.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(icon.readUInt32BE(16),512);
  assert.equal(icon.readUInt32BE(20),512);
});
