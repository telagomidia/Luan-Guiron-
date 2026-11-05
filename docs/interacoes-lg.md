# Interações LG — implementação

Referência de restauração: main `72e10fe87978cba145933573c148c7f13ba6eb89` e backup anterior. Issue #73.

## Lista executada

- [x] Botões: resposta ao pressionar, brilho discreto nos CTAs com mouse, foco visível por teclado.
- [x] Página inicial: seção atual no menu e entrada única dos passos do método.
- [x] Acesso e formulários: foco dos campos, erros nativos associados ao campo, transições de diálogos e confirmação de senha/cadastro após resposta do serviço.
- [x] Portal: transições curtas entre áreas; menu móvel sem deslocar sua ancoragem no cabeçalho.
- [x] Treino: seleção de treino/descanso, série marcada e destaque de nova série. Marcar série continua sendo local até finalizar.
- [x] Descanso: barra de tempo restante e destaque ao terminar; números do cronômetro não são anunciados a cada atualização.
- [x] Treino salvo: check verde, halo e partículas uma vez, somente após gravação confirmada; falha e sessão reutilizada não celebram.
- [x] Calendário: seleção e destaque do dia recém-salvo, inclusive quando a data informada é de outro mês.
- [x] Anamnese: confirmação com check após salvar; mantém retorno à tela inicial e fallback sem o módulo de animação.
- [x] Evolução e histórico: entrada discreta das áreas de detalhes/comparação; imagens e números sem animações decorativas próprias.
- [x] Professor: feedback ao copiar link/modelo, exercício salvo destacado, linhas novas de testes destacadas e transição entre etapas da avaliação.
- [x] Avaliações: prévia local de foto selecionada e indicação de envio de fotos/relatório; URLs temporárias liberadas ao substituir/fechar.
- [x] Importação: leitura/validação e foco no campo inválido. PDF: mensagens de preparação, resultado e falha.
- [x] Carregamentos, orientação, plano e financeiro: preservados estados existentes de espera/erro/confirmação, com feedback compartilhado dos controles e das superfícies.
- [x] Movimento reduzido: efeitos e transições desativados; check estático preservado.

## Critérios visuais e limites

Roxo LG nos controles, verde nas confirmações; maior celebração reservada ao treino. Sem ciclos decorativos, animação de indicadores clínicos ou celebração de exclusão/erro. Identidade, hero, grid, densidade, fontes e conteúdo do projeto foram preservados; nenhuma composição de outro site foi transplantada. Sem novas dependências em produção ou mudanças no banco, autenticação, permissões ou regras de cobrança.

O módulo observa apenas inserções de DOM em superfícies delimitadas; não observa atributos ou os valores do cronômetro. Prévia de foto é local e não envia arquivos por conta própria. As versões dos arquivos alterados foram atualizadas para evitar cache antigo.

## Verificação

- 309 testes de lógica.
- Oito suítes de integração DOM.
- Testes Chromium existentes de layout (320–1920 px), menu, treino, cobrança, backup, cadastro e anamnese.
- Nova suíte Chromium para foco, validação, movimento reduzido, celebração única, cópia repetida e ciclo de prévias de fotos.
- Teste de treino ampliado: nenhuma celebração em falha; check e partículas após confirmação, sem duplicar o envio.

Testes com dados sintéticos e serviços simulados: não criam registros de alunos na produção. Execução automatizada também configurada no GitHub Actions antes de integrar a atualização.
