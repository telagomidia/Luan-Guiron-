const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const helper = fs.readFileSync(__dirname + '/../auth-client.js', 'utf8');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function setup(options = {}) {
  const elements = {};
  function element(id) {
    return elements[id] = { value: '', type: 'password', textContent: '', disabled: false, attrs: {}, listeners: {},
      addEventListener(name, fn) { this.listeners[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); },
      reportValidity() { return options.valid !== false; },
      querySelector() { return elements.button; } };
  }
  for (const id of ['loginModal','loginForm','loginMsg','loginEmail','loginPassword','loginBtn','closeLogin','togglePassword','button']) element(id);
  const calls = [], redirects = [];
  const profile = options.profile === undefined ? { id: 'user-1', role: 'student', active: true, full_name: 'Teste' } : options.profile;
  const client = { auth: {
    getSession: async () => options.session || { data: { session: null }, error: null },
    getUser: async () => options.userResult || { data: { user: { id: 'user-1' } }, error: null },
    signInWithPassword: async value => { calls.push(value); return options.login ? options.login(value) : { data: { session: {} }, error: null }; }
  }, from(table) { assert.equal(table,'profiles'); return { select() { return this; }, eq(field,id) { assert.equal(field,'id'); assert.equal(id,'user-1'); return this; }, maybeSingle: async () => ({ data: profile, error: options.profileError || null }) }; } };
  const context = { navigator: { onLine: options.online !== false }, location: { replace: url => redirects.push(url) },
    document: { readyState: 'complete', querySelector: selector => elements[selector.slice(1)] },
    setTimeout, clearTimeout, AbortController, URL, fetch: options.fetch || fetch };
  context.window = { LG_CONFIG: { supabaseUrl: 'https://example.test', supabaseKey: 'public' },
    supabase: options.sdkMissing ? undefined : { createClient: (url,key,settings) => { options.capture?.(settings); return client; } } };
  vm.createContext(context); vm.runInContext(helper, context);
  return { context, api: context.window.LG_AUTH, client, elements, calls, redirects, start: () => vm.runInContext(app, context) };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
for (const [role,destination] of [['trainer','./admin.html'],['student','./portal.html']]) {
  test('route by validated role: '+role, async () => {
    const s=setup({profile:{id:'user-1',role,active:true}});
    assert.equal((await s.api.access(s.client)).destination,destination);
  });
}
for (const [profile,code] of [[null,'profile_missing'],[{role:'trainer',active:false},'profile_inactive'],[{role:'admin',active:true},'profile_role_invalid']]) {
  test('deny '+code, async () => { const s=setup({profile}); await assert.rejects(s.api.access(s.client),e=>e.code===code); });
}
test('profile permission error is handled',async()=>{const s=setup({profileError:{code:'42501'}});await assert.rejects(s.api.access(s.client),e=>e.code==='profile_unavailable');});
test('getUser rejects stale session',async()=>{const s=setup({userResult:{error:{code:'session_expired'}}});await assert.rejects(s.api.access(s.client),e=>e.code==='session_expired');});
test('deadline ends stalled operation',async()=>{const s=setup();await assert.rejects(s.api.deadline(()=>new Promise(()=>{}),5),e=>e.code==='request_timeout');});
test('late result does not redirect',async()=>{const s=setup();let resolve;await assert.rejects(s.api.deadline(()=>new Promise(r=>resolve=r),5));resolve({destination:'./admin.html'});await flush();assert.equal(s.redirects.length,0);});
for (const [error,pattern] of [[{code:'invalid_credentials'},/E-mail ou senha/],[{code:'email_not_confirmed'},/Confirme/],[{status:429},/Muitas tentativas/],[{status:503},/indisponível/],[{name:'AbortError'},/indisponível/],[{code:'profile_missing'},/perfil válido/],[{code:'session_expired'},/expirou/]]) {
  test('message '+JSON.stringify(error),()=>assert.match(setup().api.message(error),pattern));
}
test('offline message',()=>assert.match(setup({online:false}).api.message({}),/sem conexão/));
test('guest boot enables form',async()=>{const s=setup();s.start();await flush();assert.equal(s.elements.button.disabled,false);assert.equal(s.redirects.length,0);});
test('successful submit normalizes email but not password',async()=>{const s=setup();s.start();await flush();s.elements.loginEmail.value='  EXAMPLE@MAIL.COM  ';s.elements.loginPassword.value=' secret ';await s.elements.loginForm.listeners.submit({preventDefault(){}});assert.equal(s.calls[0].email,'example@mail.com');assert.equal(s.calls[0].password,' secret ');assert.equal(s.elements.loginPassword.value,'');assert.equal(s.redirects[0],'./portal.html');});
test('duplicate submit sends one request',async()=>{let resolve;const s=setup({login:()=>new Promise(r=>resolve=r)});s.start();await flush();const one=s.elements.loginForm.listeners.submit({preventDefault(){}});await flush();await s.elements.loginForm.listeners.submit({preventDefault(){}});assert.equal(s.calls.length,1);resolve({data:{session:{}},error:null});await one;assert.equal(s.elements.button.disabled,false);});
test('auth failure releases button',async()=>{const s=setup({login:async()=>({error:{code:'invalid_credentials'}})});s.start();await flush();await s.elements.loginForm.listeners.submit({preventDefault(){}});assert.equal(s.elements.button.disabled,false);assert.match(s.elements.loginMsg.textContent,/E-mail ou senha/);assert.equal(s.redirects.length,0);});
test('offline submit makes no request',async()=>{const s=setup({online:false});s.start();await flush();await s.elements.loginForm.listeners.submit({preventDefault(){}});assert.equal(s.calls.length,0);});
test('missing SDK leaves modal usable and explains error',()=>{const s=setup({sdkMissing:true});s.start();s.elements.loginBtn.listeners.click();assert.equal(s.elements.loginModal.open,true);assert.match(s.elements.loginMsg.textContent,/carregar/);assert.equal(s.elements.button.disabled,true);});
test('password toggle and close cleanup',async()=>{const s=setup();s.start();await flush();s.elements.togglePassword.listeners.click();assert.equal(s.elements.loginPassword.type,'text');s.elements.loginPassword.value='test';s.elements.loginModal.close();assert.equal(s.elements.loginPassword.value,'');assert.equal(s.elements.loginPassword.type,'password');});
test('restored session also uses validated profile',async()=>{const s=setup({session:{data:{session:{user:{email:'admin@example.test'}}}}});s.start();await flush();assert.equal(s.redirects[0],'./portal.html');});
test('all inline scripts compile and helpers load first',()=>{for(const page of ['index.html','admin.html','portal.html']){const html=fs.readFileSync(__dirname+'/../'+page,'utf8');for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(!match[1].includes('src='))new vm.Script(match[2]);}assert.ok(html.includes('auth-client.js?v=1'));} });
test('login fetch aborts stalled network',async()=>{let settings;const s=setup({capture:x=>settings=x,fetch:async(input,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))))});s.context.setTimeout=(fn,ms)=>setTimeout(fn,ms===12000?5:ms);s.api.createClient();await assert.rejects(settings.global.fetch('https://example.test/auth/v1/user'),e=>e.name==='AbortError');});
test('uploads are not given login timeout',async()=>{let settings,captured;const s=setup({capture:x=>settings=x,fetch:async(input,init)=>{captured=init;return {ok:true};}});s.api.createClient();const init={method:'POST',body:'photo'};await settings.global.fetch('https://example.test/storage/v1/object/private/photo',init);assert.equal(captured,init);});

