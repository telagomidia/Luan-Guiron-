# Acesso de alunos cadastrados pelo professor

## Estudo

O cadastro manual existente cria uma conta Auth com senha aleatória e um perfil student com o mesmo id. Não entrega senha nem convite. cadastro.html existe e permite novos alunos escolherem senha e responderem a anamnese, mas não serve para substituir a senha de uma conta existente.

A implementação usa Auth admin.generateLink(type recovery) somente no servidor e verifyOtp(token_hash,type recovery) na página pública. O link usa fragmento para evitar envio do token em logs de acesso e referer. É preciso clicar em Continuar antes da verificação, evitando consumir o token apenas pela abertura de um preview.

Documentação consultada: https://supabase.com/docs/reference/javascript/auth-admin-generatelink e https://supabase.com/docs/reference/javascript/auth-verifyotp .

## Plano executado

1. Conferir cadastro, função create-student, perfil/conta e documentação Auth.
2. Criar serviço protegido para professor ativo gerar recuperação para aluno ativo já existente.
3. Criar senha.html com verificação do link, validação da senha e confirmação pelo servidor.
4. Adicionar geração/cópia no perfil do aluno e atalho de cadastro no dashboard.
5. Revisar permissões e estados de erro, testar e publicar via PR e Pages.

## Uso

Professor: Alunos → Abrir perfil → Definir / redefinir senha → Gerar link → Copiar link. Enviar diretamente ao próprio aluno, por um canal de confiança. O link permite acesso à conta; não compartilhar em grupos.

Aluno: abrir link, clicar Continuar e definir senha, informar/confirmar senha com pelo menos 8 caracteres, salvar e entrar pelo login normal. Conta, perfil, treinos e avaliações mantêm os mesmos ids.

Dashboard: Copiar link de cadastro, destinado a novos alunos. A página cadastro.html não foi alterada.

## Segurança e limitações

- Serviço exige JWT válido, getUser no servidor, perfil trainer active=true e alvo student active=true.
- E-mail obtido de Auth pelo id, sem confiar em e-mail enviado pelo navegador ou role de user_metadata.
- Chave administrativa apenas em variáveis do servidor; nenhuma senha é gerada pelo professor.
- URL da página fixada no servidor. Token sem logs e sem persistência em storage. Respostas no-store.
- Página remove fragmento do histórico e mantém sessão de recuperação em memória com storageKey separado. Não altera o login persistido do professor.
- Verifica identidade pelo servidor antes de mostrar formulário e antes de mudar senha. Sucesso exige usuário retornado correspondente.
- Link sujeito à expiração e uso único de Auth. Geração duplicada é bloqueada no formulário e há verificação de recovery_sent_at recente quando fornecido por Auth; isso não substitui um limite global distribuído.
- Uma nova geração pode invalidar o link anterior; usar o mais recente. Ao atualizar a página após consumir o token, pode ser necessário solicitar outro.
- Envio automático por e-mail não foi implementado: configuração SMTP/URLs não está acessível no conector atual. O fluxo publicado gera um link para o professor copiar e enviar, sem depender de SMTP. Nenhum e-mail ou WhatsApp foi enviado pela implementação.
- RLS e schema existentes foram preservados.

## Revisão e testes

124 testes passaram (96 regressões existentes e 28 testes novos de serviço, página e painel). Cobrem ausência de autenticação, aluno como solicitante, professor/aluno inativos, origem inválida, conta incorreta, falha de geração, link inválido, sessão isolada, identidade divergente, confirmação de senha, clique repetido, erro de senha fraca, limpeza de campos e cópia explícita.

O serviço foi implantado com verify_jwt=true. Teste HTTP sem autenticação deve retornar 401. O teste completo com um link gerado no painel e a senha escolhida pelo aluno permanece para a sessão real do usuário; testes automatizados simulam as chamadas Auth e não alteram senhas de alunos reais.

Revisão visual: identidade LG roxa, página compacta e foco na tarefa, layout móvel, labels, foco visível, autocomplete de nova senha, status aria-live e proteção no-referrer/noindex. Sem mudanças no desenho geral do dashboard.
