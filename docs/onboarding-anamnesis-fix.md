# Cadastro e anamnese: revisão do envio

## Diagnóstico

O cadastro anterior chamava `auth.signUp` e encerrava o fluxo se a resposta não trouxesse sessão. Quando há confirmação de e-mail, a conta pode existir antes do envio da anamnese. O botão voltava a chamar signup em vez de retomar a gravação. Exceções de rede não eram tratadas e a gravação não retornava uma linha para confirmação. Na investigação do incidente não existia resposta órfã a vincular: o período consultado registrava signup, mas nenhum POST de anamnese.

## Plano executado

1. Conferir a existência do registro, a associação `student_id`, os logs e as permissões, sem modificar dados clínicos reais.
2. Separar o cadastro em modelo e interface, reutilizando as validações da área do aluno.
3. Oferecer login explícito para conta existente e retomada após confirmar e-mail. Manter respostas na mesma página até confirmação do envio.
4. Conferir usuário no servidor (`getUser`), e-mail e perfil ativo de aluno antes de gravar. Usar UUID estável por formulário, upsert e retorno de `id,student_id`, com horário de submissão.
5. Testar validações, confirmação pendente, falhas, reenvio, clique duplo, identidade/perfil indevidos e visibilidade para professor; revisar e publicar via PR.

## Segurança e limites

- Não foram removidas RLS nem desativada confirmação de e-mail.
- A sessão do cadastro é isolada e não substitui a sessão do professor.
- Respostas de saúde não são copiadas para metadados de Auth/JWT, logs ou armazenamento local. Permanecem no formulário até envio autenticado.
- Antes de sair, o navegador avisa sobre o envio pendente. Se a página for fechada/recarregada, é necessário preencher novamente na área do aluno; não há recuperação de respostas que nunca chegaram ao servidor.
- Uma anamnese previamente enviada em outro dispositivo não é sobrescrita pelo cadastro: a tela orienta consultar/editar na área LG.
- Nenhuma anamnese vazia ou resposta presumida foi criada para fazer desaparecer uma pendência.

## Verificação

- `node --test tests/*.test.cjs`: regressão e 29 testes específicos de cadastro.
- `tests/onboarding-ui.check.mjs`: página real em DOM; confirmação/login/falha/reenvio/clique duplo, identidade incorreta e perfil inativo.
- `tests/onboarding-browser.check.mjs`: os mesmos cenários em Chromium, nas larguras 320, 390, 768 e 1440, incluindo checagem de overflow.
- `tests/onboarding-rls.sql`: identidades sintéticas dentro de transação com rollback; gravação própria, retry sem duplicação, timestamp, leitura do professor, isolamento e bloqueio de perfil inativo.
- Suites existentes de painel, portal, layout e backup continuam no CI. Os testes não enviam e-mail nem alteram respostas de alunos reais.

## Recuperação do incidente

Confirmar com o professor qual aluno reportou a falha. Se não há registro no banco, não há respostas para simplesmente vincular. O aluno deve entrar com sua conta existente, abrir **Anamnese**, responder/revisar e clicar em enviar; o portal salva sob sua própria identidade e confirma a gravação. O professor atualiza o painel após o envio. Se o formulário original ainda estiver aberto, preservar as respostas antes de recarregar a página.
