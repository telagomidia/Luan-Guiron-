(() => {
  'use strict';
  const status = document.querySelector('#passwordStatus'), verify = document.querySelector('#verifyLink');
  const form = document.querySelector('#passwordForm'), password = document.querySelector('#newPassword'), confirm = document.querySelector('#confirmPassword'), save = document.querySelector('#savePassword');
  const show = (text, error = false) => { status.textContent = text; status.className = error ? 'error' : ''; };
  const fragment = new URLSearchParams(location.hash.slice(1));
  let token = fragment.get('token_hash'), client, verifiedUser = null, busy = false, completed = false;
  const isEmailRecovery = fragment.get('type') === 'recovery' && Boolean(fragment.get('access_token'));
  const clearSensitiveUrl = () => history.replaceState(null, '', location.pathname);

  if ((!token || !/^[a-zA-Z0-9_-]{32,256}$/.test(token)) && !isEmailRecovery) {
    show('Este link está incompleto. Solicite uma nova redefinição de senha.', true); verify.hidden = true; return;
  }
  try {
    client = supabase.createClient(LG_CONFIG.supabaseUrl, LG_CONFIG.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: isEmailRecovery, storageKey: 'lg-password-recovery' },
      global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(12000) }) }
    });
  } catch { show('Não foi possível carregar o acesso. Abra o link original novamente.', true); return; }

  function exposeForm(userId) {
    verifiedUser = userId; token = null; verify.hidden = true; form.hidden = false;
    show('Link confirmado. Crie uma senha com pelo menos 8 caracteres.'); password.focus();
  }
  async function confirmIdentity(expectedId) {
    const identity = await LG_AUTH.deadline(() => client.auth.getUser());
    if (identity.error || !identity.data?.user || (expectedId && identity.data.user.id !== expectedId)) throw new Error('invalid_link');
    exposeForm(identity.data.user.id);
  }

  if (isEmailRecovery) {
    verify.hidden = true; show('Conferindo seu link de redefinição...');
    void (async () => {
      try {
        const result = await LG_AUTH.deadline(() => client.auth.getSession());
        clearSensitiveUrl();
        if (result.error || !result.data?.session?.user) throw result.error || new Error('invalid_link');
        await confirmIdentity(result.data.session.user.id);
      } catch {
        clearSensitiveUrl();
        show('Link inválido, expirado ou não foi possível verificar. Solicite uma nova redefinição de senha.', true);
      }
    })();
  } else {
    // The teacher-generated bearer token is removed before any network call.
    clearSensitiveUrl(); verify.disabled = false;
    verify.onclick = async () => {
      if (busy || verifiedUser) return;
      busy = true; verify.disabled = true; show('Conferindo seu link...');
      try {
        const result = await LG_AUTH.deadline(() => client.auth.verifyOtp({ token_hash: token, type: 'recovery' }));
        if (result.error || !result.data?.session || !result.data?.user) throw result.error || new Error('invalid_link');
        await confirmIdentity(result.data.user.id);
      } catch { show('Link inválido, expirado ou não foi possível verificar. Confira a conexão; se persistir, peça outro link.', true); }
      finally { busy = false; verify.disabled = false; }
    };
  }

  document.querySelector('#togglePassword').onclick = event => {
    const visible = password.type === 'password'; password.type = confirm.type = visible ? 'text' : 'password';
    event.currentTarget.textContent = visible ? 'Ocultar senhas' : 'Mostrar senhas'; event.currentTarget.setAttribute('aria-pressed', String(visible));
  };
  form.onsubmit = async event => {
    event.preventDefault();
    if (busy || completed || !verifiedUser || !form.reportValidity()) return;
    if (password.value !== confirm.value) return show('As senhas não são iguais.', true);
    busy = true; save.disabled = true; show('Salvando sua senha...');
    try {
      const identity = await LG_AUTH.deadline(() => client.auth.getUser());
      if (identity.error || identity.data?.user?.id !== verifiedUser) throw new Error('invalid_session');
      const result = await LG_AUTH.deadline(() => client.auth.updateUser({ password: password.value }));
      if (result.error || result.data?.user?.id !== verifiedUser) throw result.error || new Error('unconfirmed');
      completed = true; password.value = confirm.value = ''; form.hidden = true;
      show('Senha definida! Clique em “Voltar ao login” e entre com seu e-mail e a nova senha.');
      try { await LG_AUTH.deadline(() => client.auth.signOut({ scope: 'local' })); } catch { /* No persistence; closing the page discards the session. */ }
    } catch (error) {
      show(error?.code === 'weak_password' ? 'Escolha uma senha mais forte, com letras, números e símbolos.' : error?.code === 'same_password' ? 'Escolha uma senha diferente da atual.' : 'Não foi possível confirmar a alteração. Tente entrar com a nova senha; se não funcionar, peça um novo link.', true);
    } finally { busy = false; save.disabled = completed; }
  };
})();
