const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
test('browser SDK bytes are pinned and auth pages serve the committed asset',()=>{
 const bytes=fs.readFileSync(__dirname+'/../public/vendor/supabase-2.57.4.js');assert.equal(createHash('sha256').update(bytes).digest('hex'),'7e94b62086deecef8c0ba3b38f514e2a1944ff6c81d92fb3ff967828c406c38f');
 for(const file of ['index','portal','admin','cadastro','senha','ativar-admin']){const html=fs.readFileSync(__dirname+'/../'+file+'.html','utf8');assert.match(html,/src="\.\/public\/vendor\/supabase-2\.57\.4\.js"/);assert.doesNotMatch(html,/cdn\.jsdelivr.*supabase-js/);}
});
