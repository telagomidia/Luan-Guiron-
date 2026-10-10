/* Passwords and decrypted content stay in this page's memory; never in storage/logs. */
(function(){'use strict';
 let dispose=()=>{};
 function clear(){dispose();dispose=()=>{};}
 function mount({client,container}){
  clear();
  container.innerHTML='<div class="ey">Proteção dos dados</div><h1>Segurança e backups.</h1><p class="muted">Cópia manual criptografada dos cadastros, treinos, avaliações, observações privadas e arquivos do sistema.</p><div class="student-grid"><section class="student-section"><h2>Criar cópia</h2><p>Escolha uma senha exclusiva e guarde-a separadamente. Sem ela não será possível abrir o backup.</p><form id="backupCreate" class="form"><div class="field full"><label for="backupPass">Senha do backup (mínimo 12 caracteres)</label><input id="backupPass" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></div><div class="field full"><label for="backupConfirm">Confirmar senha</label><input id="backupConfirm" type="password" minlength="12" maxlength="256" autocomplete="new-password" required></div><div class="actions"><button class="primary" type="submit">Preparar backup</button><a id="backupSave" class="ghost" hidden>Salvar arquivo criptografado</a></div></form></section><section class="student-section"><h2>Conferir uma cópia</h2><p>Abre e verifica o arquivo localmente. Não envia seu arquivo ou senha ao servidor e não altera o banco.</p><form id="backupVerify" class="form"><div class="field full"><label for="backupFile">Arquivo .lgbackup</label><input id="backupFile" type="file" accept=".lgbackup,application/json" required></div><div class="field full"><label for="backupVerifyPass">Senha usada na cópia</label><input id="backupVerifyPass" type="password" maxlength="256" autocomplete="off" required></div><div class="actions"><button class="primary" type="submit">Verificar integridade</button></div></form></section></div><p id="backupStatus" role="status" aria-live="polite"></p><section class="empty"><h2>O que esta cópia não inclui</h2><p>Contas e senhas do Supabase Auth, estrutura e configurações do servidor e funções de infraestrutura. Isto não substitui um backup completo do Supabase.</p><p>Salve uma cópia em um local privado fora do servidor e confira o arquivo salvo. Faça nova cópia antes de alterações importantes. A restauração exige ambiente separado e revisão técnica; não existe botão para sobrescrever a produção.</p><p>Limites desta ferramenta: 20 MB de dados e 50 MB de arquivos. Não há agendamento automático ou sincronização com o Drive.</p></section>';
  const section=container.querySelector('#backupCreate'),verify=container.querySelector('#backupVerify'),status=container.querySelector('#backupStatus'),save=container.querySelector('#backupSave');let url=null,alive=true,busy=false;
  function revoke(){if(url)URL.revokeObjectURL(url);url=null;save.hidden=true;save.removeAttribute('href');}
  function message(text){if(alive&&status.isConnected)status.textContent=text;}
  function lock(value){busy=value;for(const el of [...section.elements,...verify.elements])el.disabled=value;}
  dispose=()=>{alive=false;revoke();section.reset();verify.reset();};
  section.onsubmit=async e=>{e.preventDefault();if(busy)return;revoke();lock(true);let pass=section.querySelector('#backupPass').value;try{
   LG_BACKUP.password(pass);if(pass!==section.querySelector('#backupConfirm').value)throw new Error('As senhas não coincidem.');
   message('Obtendo dados e copiando arquivos…');const payload=await LG_BACKUP.collect(client,message);message('Criptografando e conferindo a cópia…');const encrypted=await LG_BACKUP.encrypt(payload,pass);await LG_BACKUP.decrypt(encrypted,pass);
   if(!alive)return;url=URL.createObjectURL(new Blob([encrypted],{type:'application/json'}));save.href=url;save.download='luan-guiron-'+new Date().toISOString().replace(/[:.]/g,'-')+'.lgbackup';save.hidden=false;
   message('Cópia preparada e verificada. Clique em “Salvar arquivo criptografado”; depois confira o arquivo salvo na seção ao lado.');
  }catch(error){message(error.message||'Não foi possível preparar a cópia.');}finally{pass='';section.reset();lock(false);}};
  verify.onsubmit=async e=>{e.preventDefault();if(busy)return;lock(true);let pass=verify.querySelector('#backupVerifyPass').value;try{
   const file=verify.querySelector('#backupFile').files[0];if(!file||file.size>LG_BACKUP.MAX_FILE)throw new Error('Selecione um backup de até 100 MB.');message('Verificando cópia localmente…');
   const content=await LG_BACKUP.decrypt(await file.text(),pass),result=await LG_BACKUP.validate(content);const records=Object.values(result.tables).reduce((a,b)=>a+b,0);
   message('Integridade confirmada: '+records+' registros, '+result.private_notes+' observações privadas e '+result.files+' arquivos. Cópia de '+new Date(result.created_at).toLocaleString('pt-BR')+'. Nenhum dado foi restaurado.');
  }catch(error){message(error.message||'Não foi possível verificar o arquivo.');}finally{pass='';verify.reset();lock(false);}};
 }
 window.addEventListener('pagehide',clear);window.LG_BACKUP_UI=Object.freeze({mount,clear});
})();
