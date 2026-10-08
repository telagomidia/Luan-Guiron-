export function passwordLinkHandler({ caller, admin, now = Date.now }) {
  const origin = 'https://telagomidia.github.io';
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  return async request => {
    if (request.headers.get('Origin') && request.headers.get('Origin') !== origin) return reply({ error: 'Origem não permitida.' }, 403);
    if (request.method === 'OPTIONS') return new Response('ok', { headers });
    if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
    try {
      const authorization = request.headers.get('Authorization') || '';
      if (!/^Bearer\s+\S+$/i.test(authorization)) return reply({ error: 'Entre novamente no painel.' }, 401);
      const client = caller(authorization);
      const identity = await client.auth.getUser();
      if (identity.error || !identity.data?.user) return reply({ error: 'Sessão inválida.' }, 401);
      const trainer = await client.from('profiles').select('role,active').eq('id', identity.data.user.id).maybeSingle();
      if (trainer.error || trainer.data?.role !== 'trainer' || trainer.data.active !== true) return reply({ error: 'Apenas o professor ativo pode gerar links.' }, 403);
      const body = await request.json();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.student_id || '')) return reply({ error: 'Aluno inválido.' }, 400);
      const student = await admin.from('profiles').select('id,role,active').eq('id', body.student_id).maybeSingle();
      if (student.error || student.data?.role !== 'student' || student.data.active !== true) return reply({ error: 'Selecione um aluno ativo.' }, 400);
      const account = await admin.auth.admin.getUserById(body.student_id);
      if (account.error || !account.data?.user?.email || account.data.user.id !== body.student_id) return reply({ error: 'Aluno sem conta de acesso vinculada.' }, 400);
      const last = Date.parse(account.data.user.recovery_sent_at || '');
      if (Number.isFinite(last) && now() - last < 60000) return reply({ error: 'Aguarde um minuto antes de gerar outro link.' }, 429);
      const generated = await admin.auth.admin.generateLink({ type: 'recovery', email: account.data.user.email });
      const hash = generated.data?.properties?.hashed_token;
      if (generated.error || !hash || generated.data?.user?.id !== body.student_id) return reply({ error: 'Não foi possível gerar o link. Tente novamente.' }, 502);
      const url = new URL('/Luan-Guiron-/senha.html', origin);
      url.hash = new URLSearchParams({ token_hash: hash }).toString();
      return reply({ url: url.href });
    } catch { return reply({ error: 'Não foi possível concluir. Confira a conexão e tente novamente.' }, 500); }
  };
}
