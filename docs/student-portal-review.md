# Área do aluno — entrega e revisão

## Implementado

Plano em student-portal-plan.md executado: oito áreas funcionais, consultas da própria conta, ficha de treino completa, cronômetro, sessão com cargas reais, histórico paginado, avaliações/relatórios, evolução com gráfico e tabela, fotos privadas e comparação, anamnese editável, orientações e perfil/senha. Sem dados, cada módulo explica o que ainda precisa ser cadastrado pelo professor.

Portal foi dividido em HTML/CSS, modelo/API, views e controlador. Identidade é validada por getUser e perfil ativo; professor continua redirecionado ao admin. Nenhum rascunho de saúde, senha ou URL assinada é persistido pelo portal. A sessão Auth existente permanece a da aplicação.

Banco: student-portal.sql aplicado ao projeto existente. RPC SECURITY INVOKER record_student_workout grava sessão e séries juntas. UUID estável no formulário e advisory lock garantem idempotência na repetição da mesma sessão. A transação valida aluno ativo, plano ativo, pertencimento dos exercícios, datas, números e duplicatas. Políticas impedem referências de outro aluno/treino também por chamadas diretas. Planos desativados continuam consultáveis no histórico. Desativação concorrente pode ocorrer depois da leitura inicial; não há promessa de serialização entre edição do professor e início da sessão.

Perfil: Edge Function student-profile v1 publicada com verify_jwt=true. Identidade verificada no servidor; somente nome, telefone, nascimento e sexo são atualizados no próprio perfil de aluno ativo. Papel, e-mail, ativação e observações não são recebidos como campos editáveis. Senha usa Auth updateUser após reconfirmar identidade.

Fotos/documentos: buckets privados mantidos. URLs temporárias duram 300 segundos, com caminhos da própria conta e validação de protocolo HTTPS. Fotos são cadastradas pelo professor; aluno consulta/compara. Ficha e avaliação usam impressão do navegador para A4/PDF; PDF de bioimpedância continua acessível por link privado.

## Correções encontradas na revisão

- Link de bioimpedância permanecia vazio após ação; preservado no estado de sucesso.
- Formulários de perfil/anamnese bloqueavam novas edições após primeiro salvamento; edição libera novo envio.
- Respostas históricas JSON de anamnese são preservadas na atualização dos campos atuais.
- Salvar um formulário do perfil mantém a proteção de alterações não salvas no outro formulário.
- Repetições com apenas limite superior recebem “Até N”. Zero de carga/RIR/descanso é preservado.
- Renderizações antigas não substituem a área selecionada após navegação.

## Testes executados em 08/10/2026

- 164 testes Node passaram: 124 regressões existentes e 40 novos de validação, API, dados, impressão e servidor de perfil.
- Integração DOM com happy-dom 20.14.5 passou nas oito rotas. Exercitou prescrição, ficha, salvar sessão com falha/repetição/clique duplo, mensagens e controles, PDF privado, evolução/fotos, anamnese/perfil com segunda edição, escaping, formulário sujo, resposta atrasada e erro de consulta. Também executada no CI.
- student-portal-rls.sql executado no Supabase em transação revertida: gravação atômica, idempotência, zeros, acesso próprio, isolamento de planos/avaliações/orientações/fotos, bloqueio de exercício de outro treino, dados inválidos sem sessão parcial, proteção da prescrição e papel, anamnese própria e plano inativo.
- Dados sintéticos foram revertidos. Nenhum treino, cadastro ou avaliação real alterado pelos testes.
- Função student-profile ativa; chamada sem autenticação retornou HTTP 401.
- Revisão de segurança: novo RPC é invoker e tem search_path definido. Avisos prévios do advisor sobre claim_admin_profile/is_trainer, allowlist sem política (bloqueada por RLS) e proteção de senhas vazadas não foram alterados nesta entrega. Referências: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Revisão visual e limites

Layout usa identidade LG e prioridade de tarefas recorrentes, sem hero promocional. Navegação lateral no desktop e horizontal no celular; formulários, tabelas e fotos têm adaptações de largura, foco visível, labels, estados e impressão. Não havia outro projeto visual comparável no contexto; nenhuma estrutura de outro site foi copiada.

Integração DOM não equivale a renderização em um navegador real. Chromium local não estava disponível e o download falhou; aparência em diferentes dispositivos, impressão final, Signed URL de arquivo real e fluxo autenticado real ainda devem ser conferidos com uma conta de aluno. Não foram usados senha/token de alunos para testes. A suíte de banco testa permissões com identidades sintéticas.

## Roteiro de aceitação na página

1. Entrar com conta de aluno (professor é redirecionado ao admin).
2. Abrir Meu treino → plano ativo → treino A/B/C; conferir séries, repetições, RIR, descanso e notas; abrir ficha e salvar PDF.
3. Registrar uma sessão: preencher repetições/carga, marcar séries Feitas, salvar; conferir em Histórico.
4. Abrir Avaliações/relatório/PDF privado e Evolução; conferir fotos quando já cadastradas pelo professor.
5. Preencher ou editar Anamnese/PAR-Q, confirmar revisão e salvar; professor confere no cadastro.
6. Ler orientações e editar Perfil; testar nova senha somente na própria conta.

Pagamentos, chat, notificações e catálogo de vídeos são evoluções futuras. Esta entrega cobre o acompanhamento que os documentos e banco atuais suportam.
