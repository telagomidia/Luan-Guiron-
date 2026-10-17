(() => {
  'use strict';
  function start() {
    const recoveryFragment = new URLSearchParams(location.hash?.slice(1) || '');
    if (recoveryFragment.get('type') === 'recovery' && recoveryFragment.get('access_token') && window.LG_URLS?.password) {
      location.replace(window.LG_URLS.password() + location.hash); return;
    }
    const modal = document.querySelector('#loginModal'), form = document.querySelector('#loginForm');
    const msg = document.querySelector('#loginMsg'), button = document.querySelector('#loginSubmit') || form?.querySelector('[type="submit"]');
    const emailInput = document.querySelector('#loginEmail'), passwordInput = document.querySelector('#loginPassword');
    const passwordFields = document.querySelector('#loginPasswordFields'), forgot = document.querySelector('#forgotPassword');
    const title = document.querySelector('#loginTitle'), intro = document.querySelector('#loginIntro'), createAccount = document.querySelector('#createAccount');
    if (!modal || !form || !msg || !button) return;
    let client, busy = false, mode = 'login';
    const show = (text, kind = '') => { msg.textContent = text; if (msg.dataset) { if (kind) msg.dataset.kind = kind; else delete msg.dataset.kind; } };
    const idleLabel = () => mode === 'recovery' ? 'Enviar link de redefinição' : 'Fazer login';
    function setBusy(value, text = mode === 'recovery' ? 'Enviando…' : 'Entrando…') {
      busy = value; button.disabled = value;
      form.setAttribute('aria-busy', String(value));
      button.textContent = value ? text : idleLabel();
      if (forgot) forgot.disabled = value;
    }
    function setMode(next) {
      mode = next;
      const recovering = mode === 'recovery';
      if (passwordFields) passwordFields.hidden = recovering;
      if (passwordInput) { passwordInput.required = !recovering; passwordInput.value = ''; passwordInput.type = 'password'; }
      if (title) title.textContent = recovering ? 'REDEFINIR SENHA' : 'ÁREA LG';
      if (intro) intro.textContent = recovering ? 'Informe seu e-mail para receber um link seguro de redefinição.' : 'Acesse seus treinos, avaliações e evolução.';
      if (forgot) forgot.textContent = recovering ? 'Voltar para fazer login' : 'Esqueci a senha';
      const toggle = document.querySelector('#togglePassword');
      if (toggle) { toggle.textContent = 'Mostrar senha'; toggle.setAttribute('aria-pressed', 'false'); }
      button.textContent = idleLabel(); show('');
    }
    document.querySelector('#loginBtn')?.addEventListener('click', () => modal.showModal());
    document.querySelector('#closeLogin')?.addEventListener('click', () => modal.close());
    const toggle = document.querySelector('#togglePassword');
    toggle?.addEventListener('click', () => {
      const visible = passwordInput.type === 'password';
      passwordInput.type = visible ? 'text' : 'password';
      toggle.textContent = visible ? 'Ocultar senha' : 'Mostrar senha';
      toggle.setAttribute('aria-pressed', String(visible));
    });
    modal.addEventListener('close', () => {
      setMode('login');
    });
    forgot?.addEventListener('click', () => { if (!busy) { setMode(mode === 'login' ? 'recovery' : 'login'); emailInput.focus?.(); } });
    if (createAccount && window.LG_URLS?.signup) createAccount.href = window.LG_URLS.signup();
    try { client = window.LG_AUTH.createClient(); }
    catch (error) {
      show(window.LG_AUTH?.message(error) || 'Não foi possível carregar o serviço de acesso. Atualize a página.');
      button.disabled = true;
      form.addEventListener('submit', event => event.preventDefault());
      return;
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      emailInput.value = emailInput.value.trim();
      if (!form.reportValidity()) return;
      if (navigator.onLine === false) { show(window.LG_AUTH.message({})); return; }
      const email = emailInput.value.toLowerCase();
      if (mode === 'recovery') {
        setBusy(true); show('Enviando link…');
        try {
          // Send new recovery emails directly to the isolated password page.
          // The root forwarding above remains for links issued before this update.
          const redirectTo = window.LG_URLS?.password?.() || new URL('./senha', location.href).href;
          const result = await window.LG_AUTH.deadline(() => client.auth.resetPasswordForEmail(email, { redirectTo }));
          if (result.error) throw result.error;
          show('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.', 'success');
        } catch (error) { show(window.LG_AUTH.message(error)); }
        finally { setBusy(false); }
        return;
      }
      setBusy(true); show('Entrando…');
      try {
        const password = passwordInput.value;
        // Never trim, log or persist a password ourselves.
        const result = await window.LG_AUTH.deadline(() => client.auth.signInWithPassword({ email, password }));
        if (result.error) throw result.error;
        if (!result.data?.session) throw Object.assign(new Error('No session'), { code: 'session_not_found' });
        show('Conferindo seu perfil…');
        const access = await window.LG_AUTH.access(client);
        passwordInput.value = '';
        location.replace(access.destination);
      } catch (error) { show(window.LG_AUTH.message(error)); }
      finally { setBusy(false); }
    });
    async function boot() {
      setBusy(true, 'Verificando sessão…');
      try {
        const result = await window.LG_AUTH.deadline(() => client.auth.getSession());
        if (result.error) throw result.error;
        if (!result.data?.session) return;
        const access = await window.LG_AUTH.access(client);
        location.replace(access.destination);
      } catch (error) { show(window.LG_AUTH.message(error)); }
      finally { setBusy(false); }
    }
    void boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

