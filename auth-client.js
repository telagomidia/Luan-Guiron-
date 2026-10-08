/* Routing helps the UI; RLS remains the authorization boundary. */
(() => {
  'use strict';
  function failure(code) { return Object.assign(new Error(code), { code }); }
  async function timedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    // Do not impose the login timeout on photos, PDFs or unrelated requests.
    const parsed = new URL(url);
    const authOrigin = new URL(window.LG_CONFIG.supabaseUrl).origin;
    if (parsed.origin !== authOrigin || !(parsed.pathname.startsWith('/auth/v1/') || parsed.pathname === '/rest/v1/profiles')) return fetch(input, init);
    const controller = new AbortController();
    const upstream = init.signal || input?.signal;
    const abort = () => controller.abort(upstream?.reason);
    if (upstream?.aborted) abort();
    else upstream?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 12000);
    try { return await fetch(input, { ...init, signal: controller.signal }); }
    finally { clearTimeout(timer); upstream?.removeEventListener('abort', abort); }
  }
  function deadline(operation, milliseconds = 30000) {
    let timer;
    return Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = setTimeout(() => reject(failure('request_timeout')), milliseconds); })
    ]).finally(() => clearTimeout(timer));
  }
  function createClient() {
    if (!window.supabase?.createClient || !window.LG_CONFIG?.supabaseUrl || !window.LG_CONFIG?.supabaseKey) throw failure('client_unavailable');
    return window.supabase.createClient(window.LG_CONFIG.supabaseUrl, window.LG_CONFIG.supabaseKey, { global: { fetch: timedFetch } });
  }
  async function access(client) {
    return deadline(async () => {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data?.user) throw failure('session_not_found');
      const { data: profile, error: profileError } = await client.from('profiles')
        .select('id,role,active,full_name').eq('id', data.user.id).maybeSingle();
      if (profileError) throw failure('profile_unavailable');
      if (!profile) throw failure('profile_missing');
      if (profile.active !== true) throw failure('profile_inactive');
      if (!['trainer', 'student'].includes(profile.role)) throw failure('profile_role_invalid');
      return { user: data.user, profile, destination: profile.role === 'trainer' ? './admin.html' : './portal.html' };
    });
  }
  function sessionExpired(error) {
    return ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt', 'user_not_found'].includes(error?.code)
      || error?.name === 'AuthSessionMissingError';
  }
  function message(error) {
    const code = error?.code;
    if (code === 'invalid_credentials') return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
    if (code === 'email_not_confirmed') return 'Confirme seu e-mail pelo link recebido antes de entrar.';
    if (error?.status === 429 || code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
    if (code === 'profile_inactive') return 'Seu perfil está inativo. Entre em contato com o professor.';
    if (code === 'profile_missing' || code === 'profile_role_invalid') return 'Seu acesso precisa ser vinculado a um perfil válido. Entre em contato com o professor.';
    if (code === 'profile_unavailable') return 'Seu login foi reconhecido, mas não foi possível carregar suas permissões. Tente novamente.';
    if (code === 'client_unavailable') return 'Não foi possível carregar o serviço de acesso. Atualize a página e tente novamente.';
    if (sessionExpired(error)) return 'Sua sessão expirou. Entre novamente.';
    if (navigator.onLine === false) return 'Você está sem conexão. Conecte-se à internet e tente novamente.';
    if (code === 'request_timeout' || ['AbortError', 'AuthRetryableFetchError', 'TypeError'].includes(error?.name) || error?.status >= 500 || error?.status === 0)
      return 'O serviço de acesso está indisponível ou demorou para responder. Tente novamente em instantes.';
    return 'Não foi possível concluir o acesso. Tente novamente; se persistir, entre em contato com o professor.';
  }
  window.LG_AUTH = Object.freeze({ createClient, access, deadline, message, sessionExpired });
})();

