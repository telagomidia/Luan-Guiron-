(() => {
  'use strict';
  const error = code => Object.assign(new Error(code), { code });
  async function load(id) {
    const result = await sb.from('training_plans').select('id,name,active,student_id').eq('id', id).single();
    if (result.error) throw result.error;
    if (!result.data) throw error('plan_missing');
    return result.data;
  }
  async function history(id) {
    const { data, error: readError } = await sb.from('workouts').select('id').eq('plan_id', id);
    if (readError) throw readError;
    const ids = (data || []).map(x => x.id);
    if (!ids.length) return 0;
    const result = await sb.from('workout_sessions').select('id', { count: 'exact', head: true }).in('workout_id', ids);
    if (result.error) throw result.error;
    if (!Number.isInteger(result.count)) throw error('history_unavailable');
    return result.count;
  }
  async function setActive(plan, next) {
    // Compare-and-set catches a stale screen or another tab changing the plan.
    const result = await sb.from('training_plans').update({ active: next })
      .eq('id', plan.id).eq('active', plan.active).select('id,active').maybeSingle();
    if (result.error) throw result.error;
    if (!result.data || result.data.active !== next) throw error('plan_changed');
    return result.data;
  }
  async function remove(id) {
    if (await history(id) > 0) throw error('plan_has_history');
    // Server RPC and foreign keys remain authoritative, including concurrent sessions.
    const result = await sb.rpc('delete_training_plan', { p_plan_id: id });
    if (result.error) throw result.error;
    if (result.data?.deleted !== true) throw error('delete_unconfirmed');
    return result.data;
  }
  function createPayload(values) {
    const name = String(values.name || '').trim();
    const count = Number(values.workout_count);
    if (!values.student_id || !name || name.length > 120) throw error('invalid_plan');
    if (!Number.isInteger(count) || count < 1 || count > 5) throw error('invalid_workout_count');
    const start = values.starts_on || '', end = values.ends_on || '';
    for (const value of [start,end]) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T12:00:00Z')) || new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)) throw error('invalid_dates');
    }
    if (start && end && end < start) throw error('invalid_dates');
    return { student_id: values.student_id, plan_name: name, goal: String(values.goal || '').trim(),
      starts_on: start, ends_on: end, notes: String(values.notes || '').trim(),
      workouts: Array.from({ length: count }, (_,i) => ({ name: 'Treino '+String.fromCharCode(65+i), exercises: [] })) };
  }
  async function create(values) {
    const payload = createPayload(values);
    const result = await sb.rpc('import_training_plan', { p_payload: payload });
    if (result.error) throw result.error;
    if (typeof result.data !== 'string' || !result.data) throw error('create_unconfirmed');
    return result.data;
  }
  function message(e) {
    const messages = {
      plan_changed: 'O plano mudou ou não pôde ser atualizado. Atualize a tela antes de tentar novamente.',
      plan_missing: 'Plano não encontrado. Atualize a lista.',
      plan_has_history: 'Este plano possui sessões registradas. Desative-o para preservar o histórico.',
      history_unavailable: 'Não foi possível conferir o histórico. A exclusão foi bloqueada.',
      delete_unconfirmed: 'A exclusão não foi confirmada. Atualize a lista antes de tentar novamente.',
      create_unconfirmed: 'A criação não foi confirmada. Confira a lista antes de tentar novamente.',
      invalid_plan: 'Selecione o aluno e informe um nome de plano com até 120 caracteres.',
      invalid_workout_count: 'Escolha de 1 a 5 treinos.',
      invalid_dates: 'Confira as datas: o fim deve ser igual ou posterior ao início.',
      '42501': 'Seu acesso não permite essa operação.',
      '23503': 'Este plano possui registros vinculados. Desative-o para preservar o histórico.'
    };
    return messages[e?.code] || 'Não foi possível concluir a operação. Atualize a lista e tente novamente.';
  }
  window.LG_PLANS = Object.freeze({ load, history, setActive, remove, create, createPayload, message });
})();
