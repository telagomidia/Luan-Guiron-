(() => {
  'use strict';
  const signupUrl = () => new URL('./cadastro.html', location.href).href;
  window.copyStudentSignupLink = async function() {
    try { await navigator.clipboard.writeText(signupUrl()); toast('Link de cadastro copiado'); }
    catch { toast('Não foi possível copiar. Abra cadastro.html pelo endereço do site.'); }
  };
  window.studentPasswordLink = function(studentId) {
    const student = students.find(item => item.id === studentId);
    if (!student || student.active !== true) return toast('Selecione um aluno ativo.');
    document.querySelector('#mt').textContent = 'Definir senha · '+student.full_name;
    form.innerHTML = '<p>Gere um link individual para '+esc(student.full_name)+' escolher a senha da conta já cadastrada. Os treinos e avaliações permanecem vinculados.</p><p class="muted">Envie o link somente ao próprio aluno. Ele permite acesso à conta, tem validade limitada e só pode ser usado uma vez. Nenhum e-mail é enviado automaticamente.</p><div class="field"><label for="studentPasswordUrl">Link individual</label><input type="text" id="studentPasswordUrl" readonly autocomplete="off" placeholder="Clique em Gerar link" spellcheck="false"></div><p id="studentAccessStatus" role="status" aria-live="polite"></p><div class="actions"><button type="button" class="ghost" onclick="modal.close()">Fechar</button><button type="button" class="ghost" id="copyStudentPasswordUrl" disabled>Copiar link</button><button type="button" class="primary" id="generateStudentPasswordUrl">Gerar link</button></div>';
    form.onsubmit = event => event.preventDefault();
    const output = form.querySelector('#studentPasswordUrl'), status = form.querySelector('#studentAccessStatus');
    const generate = form.querySelector('#generateStudentPasswordUrl'), copy = form.querySelector('#copyStudentPasswordUrl');
    let busy = false;
    generate.onclick = async () => {
      if (busy) return;
      busy = true; generate.disabled = true; copy.disabled = true; output.value = '';
      status.textContent = 'Gerando link...'; status.className = 'muted';
      try {
        const result = await LG_AUTH.deadline(() => sb.functions.invoke('student-password-link', { body: { student_id: studentId } }));
        if (result.error) {
          let reason;
          try { reason = await result.error.context?.json(); } catch { /* Generic network errors have no response. */ }
          throw new Error(reason?.error || 'Não foi possível gerar. Confira a sessão e a conexão.');
        }
        const url = new URL(result.data?.url || '');
        const expected = new URL('./senha.html', location.href);
        if (url.origin !== expected.origin || url.pathname !== expected.pathname || !new URLSearchParams(url.hash.slice(1)).get('token_hash')) throw new Error('O serviço não confirmou um link válido.');
        // Do not update a reused modal if the teacher closed this one while waiting.
        if (!modal.open || form.querySelector('#studentPasswordUrl') !== output) return;
        output.value = url.href; copy.disabled = false; generate.disabled = true;
        status.textContent = 'Link pronto. Clique em Copiar link e envie diretamente ao aluno.';
      } catch (error) { status.className = 'bad'; status.textContent = error.message || 'Não foi possível gerar o link.'; generate.disabled = false; }
      finally { busy = false; }
    };
    copy.onclick = async () => {
      if (!output.value) return;
      try { await navigator.clipboard.writeText(output.value); status.textContent = 'Link copiado. Envie somente ao próprio aluno.'; }
      catch { output.focus(); output.select(); status.textContent = 'Selecione e copie o link manualmente.'; }
    };
    modal.addEventListener('close', () => { output.value = ''; }, { once: true });
    modal.showModal();
  };
  const baseHub = window.openStudentHub;
  if (baseHub) window.openStudentHub = async function(id, tab = 'overview') {
    await baseHub(id, tab);
    const head = view.querySelector('.student-hub-head');
    if (!head || head.querySelector('[data-student-access]')) return;
    const student = students.find(item => item.id === id);
    const controls = document.createElement('div'); controls.className = 'student-tools'; controls.dataset.studentAccess = '1';
    const password = document.createElement('button'); password.type = 'button'; password.className = 'primary'; password.textContent = 'Definir / redefinir senha'; password.disabled = student?.active !== true; password.onclick = () => studentPasswordLink(id);
    const signup = document.createElement('button'); signup.type = 'button'; signup.className = 'ghost'; signup.textContent = 'Copiar cadastro de novo aluno'; signup.onclick = copyStudentSignupLink;
    controls.append(password, signup); head.appendChild(controls);
  };
  const baseDashboard = window.dashboard;
  function dashboardControls() {
    if (view.querySelector('[data-signup-tools]')) return;
    const controls = document.createElement('div'); controls.className = 'student-tools'; controls.dataset.signupTools = '1';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = 'Copiar link de cadastro'; button.onclick = copyStudentSignupLink;
    const hint = document.createElement('p'); hint.className = 'muted'; hint.textContent = 'Aluno já cadastrado? Abra Alunos → Abrir perfil → Definir / redefinir senha.';
    controls.append(button, hint); view.appendChild(controls);
  }
  if (baseDashboard) window.dashboard = async function() { await baseDashboard(); dashboardControls(); };
  if (document.querySelector('#nav [data-page="Dashboard"].active') && view.querySelector('.stats')) dashboardControls();
})();
