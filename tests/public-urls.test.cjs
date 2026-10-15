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
