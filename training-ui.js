(() => {
  'use strict';
  const pending = new Set();
  function busy(value) {
    view.querySelectorAll('[data-plan-action]').forEach(button => { button.disabled = value; });
  }
  async function action(id, operation) {
    if (pending.has(id)) return;
    pending.add(id); busy(true);
    try { await operation(); }
    catch (error) { toast(LG_PLANS.message(error)); }
    finally { pending.delete(id); busy(pending.size > 0); }
  }
  window.treinos = async function() {
    await loadStudents();
    const { data: plans, error } = await sb.from('training_plans').select('*').order('created_at', { ascending: false });
    if (error) { toast('Não foi possível carregar os planos. Tente novamente.'); return; }
    view.innerHTML = '<div class="ey">Prescrição</div><h1>TREINOS.</h1><div class="toolbar"><p class="muted">Planos ativos e histórico dos seus alunos.</p><div class="report-actions"><button class="ghost" id="copyPlanTemplate">Copiar modelo LG</button><button class="ghost" id="importPlan">Importar treino</button><button class="primary" id="newPlan">+ Novo plano</button></div></div><div class="form"><div class="field"><label for="planSearch">Buscar plano ou aluno</label><input id="planSearch" type="search" placeholder="Nome do plano ou aluno"></div><div class="field"><label for="planStatusFilter">Estado do plano</label><select id="planStatusFilter"><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos / histórico</option></select></div></div><p class="muted" role="status" id="planCount"></p><div class="list" id="planList"></div>';
    view.querySelector('#copyPlanTemplate').onclick = copyLGTrainingTemplate;
    view.querySelector('#importPlan').onclick = () => trainingImportForm();
    view.querySelector('#newPlan').onclick = () => planForm();
    const search = view.querySelector('#planSearch'), filter = view.querySelector('#planStatusFilter');
    function render() {
      const term = search.value.trim().toLocaleLowerCase('pt-BR');
      const filtered = (plans || []).filter(plan => {
        const student = students.find(s => s.id === plan.student_id);
        return (filter.value === 'all' || (filter.value === 'active' ? plan.active === true : plan.active !== true))
          && (plan.name+' '+(student?.full_name || '')).toLocaleLowerCase('pt-BR').includes(term);
      });
      view.querySelector('#planCount').textContent = filtered.length+' plano(s) encontrado(s).';
      const list = view.querySelector('#planList');
      list.innerHTML = filtered.map(plan => '<div class="row"><div><b>'+esc(plan.name)+'</b><small>'+esc(students.find(s => s.id === plan.student_id)?.full_name || 'Aluno')+' · '+(plan.active ? 'Ativo' : 'Inativo — histórico preservado')+'</small></div><button class="primary" data-open-plan="'+esc(plan.id)+'">Abrir treinos</button></div>').join('') || '<div class="empty">Nenhum plano encontrado.</div>';
      list.querySelectorAll('[data-open-plan]').forEach(button => { button.onclick = () => openTrainingPlan(button.dataset.openPlan); });
    }
    search.oninput = filter.onchange = render; render();
  };
  window.toggleTrainingPlanActive = id => action(id, async () => {
    const plan = await LG_PLANS.load(id), next = !plan.active;
    const question = next ? 'Reativar o plano “'+plan.name+'”?' : 'Desativar o plano “'+plan.name+'”?\n\nO plano e as sessões continuarão no histórico.';
    if (!confirm(question)) return;
    await LG_PLANS.setActive(plan, next);
    toast(next ? 'Plano reativado' : 'Plano desativado; histórico preservado');
    await openTrainingPlan(id);
  });
  window.deleteTrainingPlan = id => action(id, async () => {
    const plan = await LG_PLANS.load(id);
    if (await LG_PLANS.history(id) > 0) { toast(LG_PLANS.message({ code: 'plan_has_history' })); return; }
    if (!confirm('Excluir permanentemente o plano “'+plan.name+'”?\n\nOs treinos e exercícios serão removidos. Esta ação não pode ser desfeita. Para manter o plano, use Desativar.')) return;
    if (prompt('Para confirmar a exclusão permanente, digite EXCLUIR:') !== 'EXCLUIR') { toast('Exclusão cancelada'); return; }
    await LG_PLANS.remove(id);
    toast('Plano excluído com sucesso'); await treinos();
  });
  const baseOpen = window.openTrainingPlan;
  window.openTrainingPlan = async function(id) {
    await baseOpen(id);
    const marker = view.querySelector('#workoutEditor');
    if (marker?.dataset.planId !== id) return;
    try {
      const plan = await LG_PLANS.load(id), sessions = await LG_PLANS.history(id);
      if (view.querySelector('#workoutEditor') !== marker) return;
      const toolbar = view.querySelector('.toolbar');
      const status = document.createElement('p');
      status.className = 'muted'; status.setAttribute('role','status');
      status.textContent = (plan.active ? 'Plano ativo' : 'Plano inativo — histórico preservado')+' · '+sessions+' sessão(ões) registrada(s).';
      toolbar.after(status);
      const actions = document.createElement('div'); actions.className = 'report-actions';
      function button(label, className, onClick) {
        const element = document.createElement('button'); element.type = 'button';
        element.className = className; element.textContent = label;
        element.dataset.planAction = ''; element.onclick = onClick;
        actions.appendChild(element); return element;
      }
      button('Visualizar ficha','ghost',() => trainingReport(id,false));
      button('Gerar PDF','primary',() => trainingReport(id,true));
      button(plan.active ? 'Desativar plano' : 'Reativar plano','ghost',() => toggleTrainingPlanActive(id));
      const remove = button('Excluir plano','ghost',() => deleteTrainingPlan(id));
      remove.style.color = '#b42318'; remove.style.borderColor = '#b42318';
      if (sessions > 0) {
        remove.disabled = true; remove.removeAttribute('data-plan-action');
        remove.title = 'Exclusão bloqueada: há sessões registradas. Use Desativar plano.';
        const note = document.createElement('p'); note.className = 'muted';
        note.textContent = 'A exclusão está bloqueada porque há sessões. Desative o plano para preservar o histórico.';
        toolbar.after(note);
      }
      toolbar.appendChild(actions);
      if (pending.size) busy(true);
    } catch (error) { toast('Não foi possível conferir o estado do plano. Atualize a tela antes de gerenciá-lo.'); }
  };
})();
