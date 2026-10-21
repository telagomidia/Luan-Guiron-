(() => {
  'use strict';
  const phrase = 'excluir permanentemente';
  const hidden = (archives, id, now = Date.now()) => Date.parse(archives.get(id) || '') > now;
  const date = value => new Date(value).toLocaleString('pt-BR');
  const style = document.createElement('style');
  style.textContent = '.student-delete{color:var(--danger)!important;border-color:var(--danger)!important}.student-removal-options{display:grid;gap:12px;margin:20px 0}.student-removal-options button{white-space:normal;text-align:left;padding:16px}.student-removal-options small{display:block;margin-top:8px;font-weight:400;line-height:1.5}.student-removal-status{min-height:1.5em}.student-removal-submit:disabled{opacity:.5;cursor:not-allowed}.student-removal-dialog .actions{flex-wrap:wrap}.student-removal-dialog .actions button{white-space:normal;max-width:100%}.student-removal-dialog p{overflow-wrap:anywhere}.student-card>div{min-width:0}.student-card .muted{overflow-wrap:anywhere}';
  document.head.appendChild(style);

  async function failure(result, fallback) {
    if (result.error) {
      let body;
      try { body = await result.error.context?.json(); } catch { /* Network error. */ }
      throw new Error(body?.error || fallback);
    }
    if (result.data?.error) throw new Error(result.data.error);
  }

  // Separate dialog avoids reusing a form while a destructive request is pending.
  let removalDialog;
  function dialog(student) {
    if (removalDialog?.open) return null;
    removalDialog?.remove();
    const element = document.createElement('dialog');
    element.className = 'student-removal-dialog';
    element.setAttribute('aria-labelledby', 'studentRemovalTitle');
    element.innerHTML = '<div class="modal"><div class="modalhead"><h2 id="studentRemovalTitle">Excluir aluno</h2><button type="button" class="ghost" data-close>Fechar</button></div><p><strong>'+esc(student.full_name)+'</strong><br>'+esc(student.email || 'Sem e-mail')+'</p><div data-content></div><p class="student-removal-status" role="status" aria-live="polite"></p></div>';
    element.querySelector('[data-close]').onclick = () => element.close();
    element.addEventListener('close', () => element.remove(), {once:true});
    document.body.appendChild(element);
    removalDialog = element;
    return element;
  }

  window.deleteStudent = function(id) {
    const student = students.find(item => item.id === id);
    if (!student || student.id === me?.id || student.role !== 'student') return toast('Selecione um aluno válido.');
    const element = dialog(student);
    if (!element) return;
    const content = element.querySelector('[data-content]');
    const status = element.querySelector('[role="status"]');
    let busy = false;
    const controls = () => [...element.querySelectorAll('button,input')];
    const run = async (operation, message) => {
      if (busy) return;
      busy = true;
      controls().forEach(control => control.disabled = true);
      status.className = 'student-removal-status muted'; status.textContent = 'Processando…';
      try {
        await operation();
      } catch (error) {
        status.className = 'student-removal-status bad';
        status.textContent = error.message || 'Não foi possível concluir. Tente novamente.';
        busy = false;
        controls().forEach(control => control.disabled = false);
        content.querySelector('[data-confirm]')?.dispatchEvent(new Event('input'));
        return;
      }
      busy = false; element.close(); toast(message);
      try { await alunos(); } catch { toast('Operação concluída. Reabra Alunos para atualizar a lista.'); }
    };
    element.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    content.innerHTML = '<div class="student-removal-options"><button type="button" class="ghost" data-temporary>Excluir temporariamente<small>Ocultar da lista por um prazo, preservando cadastro e histórico.</small></button><button type="button" class="ghost student-delete" data-permanent>Excluir permanentemente<small>Remover a conta e os dados de acompanhamento. Esta ação não pode ser desfeita.</small></button></div>';
    content.querySelector('[data-temporary]').onclick = () => {
      content.innerHTML = '<p>O aluno ficará na aba <strong>Ocultos</strong> e voltará à lista principal ao terminar o prazo. Você também poderá restaurá-lo antes. O acesso do aluno e as cobranças continuam como estão.</p><label for="studentHideDays">Por quantos dias?</label><input id="studentHideDays" type="number" min="1" max="3650" step="1" value="30" required><p class="muted" data-deadline></p><div class="actions"><button type="button" class="ghost" data-cancel>Cancelar</button><button type="button" class="primary student-removal-submit" data-save>Confirmar exclusão temporária</button></div>';
      const input = content.querySelector('input'), save = content.querySelector('[data-save]');
      const valid = () => input.value.trim() !== '' && Number.isInteger(Number(input.value)) && Number(input.value) >= 1 && Number(input.value) <= 3650;
      input.oninput = () => {
        save.disabled = !valid();
        content.querySelector('[data-deadline]').textContent = valid() ? 'Retorno previsto: '+date(Date.now() + Number(input.value)*86400000) : 'Escolha de 1 a 3650 dias inteiros.';
      };
      input.oninput(); input.focus();
      content.querySelector('[data-cancel]').onclick = () => element.close();
      save.onclick = () => {
        if (!valid()) return;
        const days = Number(input.value);
        return run(async () => {
          const result = await sb.rpc('archive_student_for_days', {p_student_id:id, p_days:days});
          await failure(result, 'Não foi possível ocultar o aluno. Confira a conexão.');
          if (!result.data) throw new Error('O servidor não confirmou o prazo. Reabra a lista antes de tentar novamente.');
        }, 'Aluno ocultado por '+days+' dia(s).');
      };
    };
    content.querySelector('[data-permanent]').onclick = () => {
      content.innerHTML = '<p class="bad">A conta, a anamnese, as avaliações e os treinos vinculados serão removidos sem possibilidade de restauração pelo site.</p><p>Se houver cobranças, assinaturas ou arquivos que impeçam a exclusão, o sistema informará. A exclusão não cancela cobranças no provedor de pagamento.</p><label for="studentDeleteConfirmation">Para confirmar, digite <strong>'+phrase+'</strong></label><input id="studentDeleteConfirmation" data-confirm autocomplete="off" spellcheck="false"><div class="actions"><button type="button" class="ghost" data-cancel>Cancelar</button><button type="button" class="primary student-delete student-removal-submit" data-save disabled>Excluir permanentemente</button></div>';
      const input = content.querySelector('input'), save = content.querySelector('[data-save]');
      input.oninput = () => { save.disabled = busy || input.value !== phrase; };
      input.focus(); content.querySelector('[data-cancel]').onclick = () => element.close();
      save.onclick = () => {
        if (input.value !== phrase) return;
        const confirmation = input.value;
        return run(async () => {
          const result = await sb.functions.invoke('delete-student', {body:{id, confirmation}});
          await failure(result, 'Não foi possível excluir. Confira a sessão e a conexão.');
          if (result.data?.ok !== true) throw new Error('A exclusão não foi confirmada pelo servidor. Reabra a lista.');
        }, 'Aluno excluído permanentemente.');
      };
    };
    element.showModal();
  };

  let listTicket = 0, refreshTimer;
  window.alunos = async function() {
    const ticket = ++listTicket;
    clearTimeout(refreshTimer);
    await loadStudents();
    const [archivesResult, anam, assessments, plans] = await Promise.all([
      sb.from('student_list_archives').select('student_id,hidden_until'),
      sb.from('anamneses').select('student_id'),
      sb.from('assessments').select('student_id,assessed_at').order('assessed_at',{ascending:false}),
      sb.from('training_plans').select('student_id,active').eq('active',true)
    ]);
    for (const result of [archivesResult,anam,assessments,plans]) await failure(result, 'Não foi possível carregar a lista. Reabra a aba Alunos.');
    if (ticket !== listTicket || !document.querySelector('#nav [data-page="Alunos"].active')) return;
    const archives = new Map((archivesResult.data || []).map(row => [row.student_id,row.hidden_until]));
    const allStudents = [...students];
    const withAnam = new Set((anam.data || []).map(row => row.student_id));
    const withAssessment = new Set((assessments.data || []).map(row => row.student_id));
    const withPlan = new Set((plans.data || []).map(row => row.student_id));
    let filter = 'all';
    view.innerHTML = '<div class="ey">Central de acompanhamento</div><h1>ALUNOS.</h1><p class="muted">Acompanhe cadastro, anamnese, avaliações, evolução e treinos em um único lugar.</p><div class="student-kpis" data-kpis></div><div class="toolbar"><div class="student-tools"><input id="studentSearch" aria-label="Buscar aluno" placeholder="Buscar aluno..."><button class="ghost student-filter active" data-filter="all">Todos</button><button class="ghost student-filter" data-filter="attention">Atenção</button><button class="ghost student-filter" data-filter="assessment">Sem avaliação</button><button class="ghost student-filter" data-filter="training">Sem treino</button><button class="ghost student-filter" data-filter="hidden">Ocultos</button></div><div class="report-actions"><button class="ghost" id="copySignup">Copiar link de cadastro</button><button class="primary" onclick="studentForm()">+ Novo aluno</button></div></div><p class="muted" data-list-summary role="status"></p><div id="studentList" class="list"></div>';
    const root = view.querySelector('#studentList');
    const draw = () => {
      if (!root.isConnected) return;
      const now = Date.now(), isHidden = id => hidden(archives,id,now);
      const visible = allStudents.filter(student => !isHidden(student.id));
      const count = allStudents.length - visible.length;
      view.querySelector('[data-kpis]').innerHTML = [[visible.length,'Alunos na lista'],[visible.filter(s=>!withAnam.has(s.id)).length,'Anamneses pendentes'],[visible.filter(s=>!withAssessment.has(s.id)).length,'Sem avaliação'],[visible.filter(s=>!withPlan.has(s.id)).length,'Sem treino ativo']].map(([n,label])=>'<div class="student-kpi"><strong>'+n+'</strong>'+label+'</div>').join('');
      view.querySelector('[data-filter="hidden"]').textContent = 'Ocultos ('+count+')';
      view.querySelector('[data-list-summary]').textContent = filter === 'hidden' ? 'Alunos ocultos temporariamente. Restaure a qualquer momento.' : 'Os alunos ocultos ficam fora desta lista e das contagens acima.';
      const q = view.querySelector('#studentSearch').value.trim().toLocaleLowerCase('pt-BR');
      const list = allStudents.filter(student => {
        if (isHidden(student.id) !== (filter === 'hidden')) return false;
        if (!(student.full_name || '').toLocaleLowerCase('pt-BR').includes(q) && !(student.email || '').toLocaleLowerCase('pt-BR').includes(q)) return false;
        if (filter === 'attention') return !withAnam.has(student.id) || !withAssessment.has(student.id) || !withPlan.has(student.id);
        if (filter === 'assessment') return !withAssessment.has(student.id);
        if (filter === 'training') return !withPlan.has(student.id);
        return true;
      });
      root.innerHTML = list.length ? list.map(student => '<div class="student-card" data-student-id="'+esc(student.id)+'"><div><b style="font-size:18px">'+esc(student.full_name)+'</b><div class="muted">'+esc(student.email || 'Sem e-mail')+(student.goal?' · '+esc(student.goal):'')+'</div><div class="student-badges"><span class="student-badge">'+(student.active?'Ativo':'Inativo')+'</span><span class="student-badge '+(withAnam.has(student.id)?'ok':'warn')+'">'+(withAnam.has(student.id)?'Anamnese ✓':'Anamnese pendente')+'</span><span class="student-badge">'+(withAssessment.has(student.id)?'Com avaliação':'Sem avaliação')+'</span><span class="student-badge">'+(withPlan.has(student.id)?'Treino ativo':'Sem treino ativo')+'</span>'+(isHidden(student.id)?'<span class="student-badge warn">Oculto até '+esc(date(archives.get(student.id)))+'</span>':'')+'</div></div><div class="report-actions"><button class="primary" data-action="open">Abrir perfil</button><button class="ghost" data-action="edit">Editar</button>'+(isHidden(student.id)?'<button class="ghost" data-action="restore">Restaurar agora</button>':'')+'<button class="ghost student-delete" data-action="delete">Excluir</button></div></div>').join('') : '<div class="empty">'+(filter==='hidden'?'Nenhum aluno oculto.':'Nenhum aluno corresponde ao filtro.')+'</div>';
      clearTimeout(refreshTimer);
      const next = [...archives.values()].map(value=>Date.parse(value)).filter(value=>value>now).sort((a,b)=>a-b)[0];
      if (next) refreshTimer = setTimeout(draw, Math.min(next-now+50, 2147483647));
    };
    root.onclick = async event => {
      const button = event.target.closest('[data-action]'), card = button?.closest('[data-student-id]');
      if (!card) return;
      const id = card.dataset.studentId;
      if (button.dataset.action === 'open') return openStudentHub(id);
      if (button.dataset.action === 'edit') return studentForm(id);
      if (button.dataset.action === 'delete') return deleteStudent(id);
      if (button.dataset.action === 'restore') {
        button.disabled = true;
        try {
          const result = await sb.from('student_list_archives').delete().eq('student_id',id).select('student_id');
          await failure(result, 'Não foi possível restaurar o aluno.');
          if (!result.data?.length) throw new Error('Restauração não confirmada. Atualize a lista.');
          archives.delete(id); draw(); toast('Aluno restaurado à lista.');
        } catch (error) { toast(error.message); button.disabled = false; }
      }
    };
    view.querySelector('#studentSearch').oninput = draw;
    view.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => {
      filter = button.dataset.filter;
      view.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active',item === button));
      draw();
    });
    view.querySelector('#copySignup').onclick = () => copyStudentSignupLink();
    draw();
  };
})();
