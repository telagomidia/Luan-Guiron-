(() => {
  'use strict';
  function start() {
    const modal = document.querySelector('#loginModal'), form = document.querySelector('#loginForm');
    const msg = document.querySelector('#loginMsg'), button = form?.querySelector('[type="submit"]');
    const emailInput = document.querySelector('#loginEmail'), passwordInput = document.querySelector('#loginPassword');
    if (!modal || !form || !msg || !button) return;
    let client, busy = false;
    const show = text => { msg.textContent = text; };
    function setBusy(value, text = 'Entrando…') {
      busy = value; button.disabled = value;
      form.setAttribute('aria-busy', String(value));
      button.textContent = value ? text : 'Entrar';
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
      passwordInput.value = ''; passwordInput.type = 'password';
      if (toggle) { toggle.textContent = 'Mostrar senha'; toggle.setAttribute('aria-pressed', 'false'); }
    });
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
      setBusy(true); show('Entrando…');
      try {
        const email = emailInput.value.toLowerCase(), password = passwordInput.value;
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

