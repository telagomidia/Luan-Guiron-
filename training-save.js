(() => {
  'use strict';
  const failure = (code, message) => Object.assign(new Error(message || code), { code });
  function text(value, label, max, required = false) {
    const result = String(value ?? '').trim();
    if ((required && !result) || result.length > max) throw failure('validation', label+' deve ter '+(required ? 'de 1 a ' : 'até ')+max+' caracteres.');
    return result;
  }
  function number(value, label, min, max, integer = true) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw failure('validation', label+': informe '+(integer ? 'um número inteiro ' : 'um número ' )+'entre '+min+' e '+max+'.');
    return n;
  }
  function date(value) {
    if (!value) return '';
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+'T12:00:00Z')) || new Date(value+'T12:00:00Z').toISOString().slice(0,10) !== value) throw failure('validation', 'Use uma data válida no formato AAAA-MM-DD, ou deixe vazia.');
    return value;
  }
  function exercise(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw failure('validation', 'Exercício inválido.');
    const result = {
      exercise_name: text(raw.exercise_name ?? raw.name, 'Nome do exercício', 160, true),
      sets: number(raw.sets ?? raw.target_sets, 'Séries', 1, 20),
      rep_min: number(raw.rep_min, 'Repetições mínimas', 1, 200),
      rep_max: number(raw.rep_max, 'Repetições máximas', 1, 200),
      rir: number(raw.rir ?? raw.target_rir, 'RIR', 0, 10, false),
      rest_seconds: number(raw.rest_seconds, 'Descanso em segundos', 0, 1800),
      execution: text(raw.execution ?? raw.execution_notes, 'Orientação de execução', 10000),
      notes: text(raw.notes, 'Observação do exercício', 10000)
    };
    if (result.rep_min !== null && result.rep_max !== null && result.rep_max < result.rep_min) throw failure('validation', result.exercise_name+': repetições máximas devem ser iguais ou maiores que as mínimas.');
    return result;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw failure('validation', 'Informe um objeto JSON de treino.');
    if (!Array.isArray(raw.workouts) || raw.workouts.length < 1 || raw.workouts.length > 5) throw failure('validation', 'Inclua de 1 a 5 treinos.');
    const starts = date(raw.starts_on), ends = date(raw.ends_on);
    if (starts && ends && ends < starts) throw failure('validation', 'A data final deve ser igual ou posterior à inicial.');
    return { plan_name: text(raw.plan_name ?? raw.name, 'Nome do plano', 120, true),
      goal: text(raw.goal, 'Objetivo', 10000), starts_on: starts, ends_on: ends,
      notes: text(raw.notes, 'Observações do plano', 20000),
      workouts: raw.workouts.map((w, i) => {
        if (!w || !Array.isArray(w.exercises) || !w.exercises.length) throw failure('validation', 'Treino '+(i+1)+' sem exercícios.');
        if (w.exercises.length > 200) throw failure('validation', 'Cada treino pode ter até 200 exercícios.');
        return { name: text(w.name || 'Treino '+String.fromCharCode(65+i), 'Nome do treino', 100, true), notes: text(w.notes, 'Observações do treino', 10000), exercises: w.exercises.map(exercise) };
      }) };
  }
  function parse(value) {
    let source = String(value || '').trim();
    const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
    if (fenced) source = fenced[1].trim();
    let raw;
    try { raw = JSON.parse(source); } catch { throw failure('validation', 'JSON inválido. Cole todo o conteúdo do arquivo, incluindo as chaves { e }.'); }
    return normalize(raw);
  }
  async function request(builder, timeout = 20000) {
    const controller = new AbortController();
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve(builder.abortSignal(controller.signal)),
        new Promise((_, reject) => { timer = setTimeout(() => { reject(failure('save_timeout')); controller.abort(); }, timeout); })
      ]);
      if (result.error) throw result.error;
      return result.data;
    } finally { clearTimeout(timer); }
  }
  async function importPlan(payload, studentId) {
    if (!studentId) throw failure('validation', 'Selecione o aluno.');
    const data = await request(sb.rpc('import_training_plan', { p_payload: { ...normalize(payload), student_id: studentId } }));
    if (typeof data !== 'string' || !data) throw failure('save_unconfirmed');
    return data;
  }
  async function saveExercise(values, workoutId, position, exerciseId) {
    const x = exercise(values);
    const row = { workout_id: workoutId, position: number(position, 'Posição', 1, 32767), exercise_name: x.exercise_name,
      target_sets: x.sets, rep_min: x.rep_min, rep_max: x.rep_max, target_rir: x.rir,
      rest_seconds: x.rest_seconds, execution_notes: x.execution || null, notes: x.notes || null };
    let query = sb.from('workout_exercises');
    query = exerciseId ? query.update(row).eq('id', exerciseId).eq('workout_id', workoutId) : query.insert(row);
    const saved = await request(query.select('id').single());
    if (!saved?.id || (exerciseId && saved.id !== exerciseId)) throw failure('save_unconfirmed');
    return saved;
  }
  async function renameWorkout(id, name) {
    const value = text(name, 'Nome do treino', 100, true);
    const saved = await request(sb.from('workouts').update({ name: value }).eq('id', id).select('id,name').single());
    if (saved?.id !== id || saved.name !== value) throw failure('save_unconfirmed');
    return saved;
  }
  async function removeExercise(id, workoutId) {
    const saved = await request(sb.from('workout_exercises').delete().eq('id', id).eq('workout_id', workoutId).select('id').single());
    if (saved?.id !== id) throw failure('save_unconfirmed');
  }
  function message(error) {
    if (error?.code === 'validation') return error.message;
    if (['invalid_plan','invalid_workout_count','invalid_dates'].includes(error?.code)) return LG_PLANS.message(error);
    if (error?.code === 'P0001' && error.message) return 'O banco recusou a gravação: '+String(error.message).slice(0,300);
    if (error?.code === 'save_timeout' || error?.code === 'save_unconfirmed') return 'Não foi possível confirmar a gravação. Confira a lista de planos ou exercícios antes de repetir, para evitar duplicação.';
    if (error?.code === '42501' || error?.code === 'PGRST301' || error?.code === 'PGRST303' || error?.status === 401) return 'Seu acesso expirou ou não permite salvar. Entre novamente no painel do professor.';
    if (error?.code === 'PGRST116') return 'O registro não foi encontrado ou seu acesso não permite alterá-lo. Atualize a tela.';
    if (error?.code === '23503') return 'Há registros vinculados a este exercício. Preserve o histórico e confira o treino.';
    if (error?.code === '22P02' || error?.code === '22003') return 'Confira os números e datas do treino antes de salvar.';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Você está sem conexão. Os dados continuam no formulário; reconecte antes de salvar.';
    return 'Não foi possível salvar. Confira sua conexão e a lista antes de tentar novamente.';
  }
  function feedback(target, content, isError = false) {
    let status = target.querySelector('[data-training-status]');
    if (!status) {
      status = document.createElement('p'); status.dataset.trainingStatus = '1';
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      target.appendChild(status);
    }
    status.textContent = content; status.className = isError ? 'bad' : 'muted';
  }
  function bindForm(target, button, operation, after, label = 'Salvando...') {
    let pending = false, committed = false;
    target.onsubmit = async event => {
      event.preventDefault();
      if (pending || committed) return;
      if (target.reportValidity && !target.reportValidity()) return;
      const values = Object.fromEntries(new FormData(target));
      pending = true;
      const original = button.textContent;
      const controls = [...target.querySelectorAll('input,select,textarea,button'), ...modal.querySelectorAll('.modalhead button')];
      const states = controls.map(control => control.disabled);
      const previousCancel = modal.oncancel;
      modal.oncancel = event => event.preventDefault();
      controls.forEach(control => { control.disabled = true; });
      target.setAttribute('aria-busy', 'true'); button.textContent = label;
      feedback(target, 'Gravando. Aguarde a confirmação...');
      try {
        const saved = await operation(values);
        committed = true;
        modal.close();
        try { await after(saved); }
        catch { toast('Gravação concluída, mas a visualização não carregou. Abra a lista novamente.'); }
      } catch (error) { feedback(target, message(error), true); }
      finally {
        pending = false; controls.forEach((control, i) => { control.disabled = states[i]; });
        modal.oncancel = previousCancel; target.setAttribute('aria-busy', 'false'); button.textContent = original;
      }
    };
  }
  window.LG_TRAINING = Object.freeze({ parse, normalize, exercise, request, importPlan, saveExercise, renameWorkout, removeExercise, message, feedback, bindForm });
})();
