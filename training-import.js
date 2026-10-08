(() => {
  'use strict';
  window.trainingImportForm = async function(prefillStudent = '') {
    try { await loadStudents(); }
    catch { return toast('Não foi possível carregar os alunos. Atualize a tela.'); }
    if (!students.length) return toast('Cadastre um aluno primeiro');
    document.querySelector('#mt').textContent = 'Importar treino do ChatGPT';
    form.innerHTML = '<div class="field"><label for="importStudent">Aluno</label><select id="importStudent" name="student_id" required>'+studentOptions()+'</select></div><div class="field" style="margin-top:14px"><label for="trainingJsonFile">Abrir arquivo JSON (opcional)</label><input id="trainingJsonFile" type="file" accept=".json,application/json"></div><div class="field" style="margin-top:14px"><label for="trainingPayload">Cole o FORMATO LG JSON</label><textarea id="trainingPayload" name="payload" style="min-height:260px" required placeholder="Cole todo o conteúdo do treino"></textarea></div><p class="muted">1. Escolha o aluno. 2. Confira o treino. 3. Confirme para gravar.</p><div id="importPreview"></div><p data-training-status role="status" aria-live="polite" class="muted">Clique em “Conferir treino” para liberar a gravação.</p><div class="actions"><button type="button" class="ghost" onclick="modal.close()">Cancelar</button><button type="button" class="ghost" id="validateImport">Conferir treino</button><button type="submit" class="primary" id="confirmImport" disabled>Confirmar e criar plano</button></div>';
    if (prefillStudent) form.elements.student_id.value = prefillStudent;
    const payload = form.elements.payload, student = form.elements.student_id;
    const confirm = form.querySelector('#confirmImport'), preview = form.querySelector('#importPreview');
    let parsed = null, checkedText = '', checkedStudent = '', fileVersion = 0;
    function invalidate() {
      parsed = null; confirm.disabled = true; preview.innerHTML = '';
      LG_TRAINING.feedback(form, 'O conteúdo ou aluno mudou. Clique em “Conferir treino” antes de salvar.');
    }
    payload.oninput = () => { fileVersion++; invalidate(); };
    student.onchange = invalidate;
    form.querySelector('#trainingJsonFile').onchange = async event => {
      const file = event.target.files?.[0], version = ++fileVersion;
      invalidate();
      if (!file) return;
      if (file.size > 1048576) return LG_TRAINING.feedback(form, 'O arquivo JSON deve ter até 1 MB.', true);
      try {
        const content = await file.text();
        if (version !== fileVersion || !modal.open) return;
        payload.value = content;
        LG_TRAINING.feedback(form, 'Arquivo aberto. Clique em “Conferir treino”.');
      } catch { LG_TRAINING.feedback(form, 'Não foi possível ler o arquivo. Cole o conteúdo no campo JSON.', true); }
    };
    form.querySelector('#validateImport').onclick = () => {
      try {
        if (!student.value) throw Object.assign(new Error('Selecione o aluno.'), { code: 'validation' });
        parsed = LG_TRAINING.parse(payload.value);
        checkedText = payload.value; checkedStudent = student.value;
        const total = parsed.workouts.reduce((sum, w) => sum+w.exercises.length, 0);
        preview.innerHTML = '<div class="empty" style="text-align:left"><b>'+esc(parsed.plan_name)+'</b><br>Aluno: '+esc(students.find(s => s.id === student.value)?.full_name || 'Aluno')+'<br>'+parsed.workouts.length+' treino(s) · '+total+' exercício(s)<br><br>'+parsed.workouts.map(w => '<b>'+esc(w.name)+'</b><br>'+w.exercises.map(x => esc(x.exercise_name)+' — '+(x.sets ?? '—')+' séries · '+(x.rep_min ?? '—')+'–'+(x.rep_max ?? '—')+' reps · RIR '+(x.rir ?? '—')+' · '+(x.rest_seconds ?? '—')+' s'+(x.execution ? '<br>Execução: '+esc(x.execution) : '')+(x.notes ? '<br>Observação: '+esc(x.notes) : '')).join('<br>')).join('<br><br>')+'</div>';
        confirm.disabled = false;
        LG_TRAINING.feedback(form, 'Treino conferido. Revise o aluno e os exercícios e clique em “Confirmar e criar plano”.');
      } catch (error) { parsed = null; confirm.disabled = true; preview.innerHTML = ''; LG_TRAINING.feedback(form, LG_TRAINING.message(error), true); }
    };
    LG_TRAINING.bindForm(form, confirm, async values => {
      if (!parsed || values.payload !== checkedText || values.student_id !== checkedStudent) throw Object.assign(new Error('Confira o treino e o aluno antes de salvar.'), { code: 'validation' });
      return LG_TRAINING.importPlan(parsed, values.student_id);
    }, async id => { toast('Plano e exercícios importados com sucesso'); await openTrainingPlan(id); }, 'Importando...');
    modal.showModal();
  };
  window.copyLGTrainingTemplate = async function() {
    const template = { plan_name: 'Nome do plano', goal: 'Objetivo', starts_on: '', ends_on: '', notes: 'Observações gerais', workouts: [{ name: 'Treino A', notes: '', exercises: [{ exercise_name: 'Nome do exercício', sets: 3, rep_min: 8, rep_max: 12, rir: 2, rest_seconds: 90, execution: 'Orientação de execução', notes: '' }] }] };
    try { await navigator.clipboard.writeText(JSON.stringify(template, null, 2)); toast('Modelo LG JSON copiado'); }
    catch { toast('Não foi possível copiar. Use o arquivo JSON ou tente novamente.'); }
  };
})();
