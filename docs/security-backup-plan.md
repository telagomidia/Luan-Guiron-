# Segurança, backup e recuperação — ponto 5

## Estudo e escopo

Aplicação estática existente (GitHub Pages) com Supabase Auth, RLS, Storage e quatro Edge Functions. A organização está no plano Free na auditoria de 10/10/2026. Não contratar serviços nem executar restauração sobre a produção.

Problemas encontrados: `is_trainer` não verificava `active`; políticas próprias do aluno continuavam permitindo acesso após desativação; observações cadastrais ficavam no perfil legível pelo aluno; allowlist consumida permitia reativar professor; funções antigas de criação/exclusão não conferiam atividade; PDF existente não possuía política de substituição.

## Plano de execução

1. Restringir dados clínicos, treinos e arquivos a perfis ativos, mantendo todas as regras de propriedade existentes. Professor inativo deixa de gerenciar dados. O próprio perfil permanece legível para explicar a desativação.
2. Guardar observações privadas em `lg_private`, com RLS exclusiva do professor, preservando os textos existentes e a edição no painel. Manter funções privilegiadas internas com identidade verificada e search_path fixo; API pública usa SECURITY INVOKER.
3. Tratar ativação administrativa como concessão única, verificando e-mail confirmado em Auth. Corrigir autorização dos endpoints de criação/exclusão e regras Storage para substituir PDF.
4. Adicionar cópia manual no painel: snapshot consistente de 17 tabelas e observações privadas; copiar bytes de todos os objetos dos três buckets; abortar se faltar arquivo ou se o inventário mudar; criptografar no navegador; conferir antes de disponibilizar.
5. Criar conferência local de arquivos salvos e testar descriptografia, alteração, senha errada, permissões, desativação e recuperação em tabelas temporárias.
6. Revisar diferenças contra main preservando layout aprovado, rodar regressões, abrir PR, acompanhar CI, publicar e verificar arquivos servidos.

## Uso no painel

Abra **Segurança**. Escolha senha exclusiva de pelo menos 12 caracteres, confirme e prepare a cópia. Clique em **Salvar arquivo criptografado**. Depois selecione esse arquivo e a senha em **Conferir uma cópia**. A interface informa preparação/verificação, não presume que o navegador realmente salvou no disco.

Guarde o arquivo `.lgbackup` fora do servidor em pasta privada; mantenha a senha separada, preferencialmente em gerenciador de senhas. Sem a senha, não há recuperação. Recomenda-se cópia antes de alterações importantes e retenção de várias gerações. Agendamento e envio a Drive não foram configurados.

## Conteúdo e limites

- Inclui tabelas da aplicação, observações privadas e bytes de PDFs/fotos com SHA-256. Não inclui senhas, hashes de autenticação, chaves secretas, allowlist administrativa nem contas do Auth.
- AES-256-GCM autenticado, IV e salt aleatórios; PBKDF2-HMAC-SHA256, 600.000 iterações. Senha não é enviada por esta implementação nem salva em localStorage. O navegador mantém dados descriptografados temporariamente na memória; não é uma proteção contra dispositivo comprometido.
- Limite: 100.000 linhas por tabela, 20 MB de snapshot e 50 MB de arquivos; envelope até 100 MB. Falhas não geram cópia parcial apresentada como completa. Para crescimento, usar backup operacional externo.
- Snapshot das tabelas usa função STABLE e uma visão MVCC. Bytes Storage são externos à transação; comparar inventário/atualização detecta mudanças durante a coleta, mas não equivale a um snapshot físico de toda a infraestrutura.
- URLs assinadas emitidas antes de uma desativação podem continuar válidas até expirar. RLS bloqueia novos acessos/novas URLs, não revoga URLs assinadas já emitidas. Links de recuperação já emitidos também exigem política de expiração da plataforma.

## Procedimento de recuperação

Não usar esta ferramenta para sobrescrever o banco em uso. Ela verifica a cópia, mas não fornece restauração de produção por um clique.

1. Descriptografar e conferir o arquivo em dispositivo confiável. Se houver erro de senha/integridade ou arquivo incompleto, interromper.
2. Provisionar ambiente separado mediante autorização de custo. Restaurar esquema, índices, funções, RLS e configurações a partir de migrações/backup de infraestrutura revisado; o SQL deste repositório sozinho não é o esquema completo original.
3. Restaurar Auth por mecanismo operacional próprio; se for necessário recriar contas, mapear os novos UUIDs em todos os vínculos de perfil e arquivos. Snapshot da aplicação não recupera credenciais. Não importar cadastros referenciando UUIDs ausentes de Auth.
4. Importar registros na ordem das chaves estrangeiras, preservando IDs e verificando tipos, contagens e vínculos. Importar observações em schema privado com RLS. Carregar arquivos pelos APIs Storage apropriados, conferindo SHA-256 e nomes; não inserir apenas metadados em `storage.objects` como se fossem os bytes.
5. Testar autenticação, acesso de aluno/professor, isolamento entre alunos, treino, avaliações e download real de arquivos. Executar advisors. Teste completo de desastre exige este ambiente separado.
6. Somente após revisão e autorização explícita, planejar troca do ambiente, janela e rollback. Nunca executar TRUNCATE, apagar usuários ou substituir produção por conta do ensaio.

O ensaio SQL deste trabalho usa tabelas TEMPORARY e ROLLBACK, compara conteúdo das 17 tabelas e chaves estrangeiras. Não prova recuperação completa do Auth/infraestrutura nem substitui teste de um novo projeto.

## Pendências de plataforma

Backup nativo/PITR, cópia automática externa, MFA do professor e proteção contra senhas vazadas exigem decisão/configuração própria. Nenhum serviço pago foi habilitado. O aviso de proteção de senha vazada desabilitada deve ser tratado no painel quando disponível no plano; não afirmar que foi resolvido por SQL.

Referências oficiais: [Backups](https://supabase.com/docs/guides/platform/backups), [Segurança de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [SECURITY DEFINER exposta](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [OWASP armazenamento criptográfico](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html), [OWASP PBKDF2](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## Revisão e evidências

- Migração `security_backup_hardening` aplicada ao projeto existente; funções `create-student` v3 e `delete-student` v2 publicadas com verificação JWT.
- 194 testes Node aprovados. Integrações DOM da área do aluno e do dashboard aprovadas.
- CI Chromium aprovado: 60 verificações de layout em seis páginas a 320/390/430/768/1440 px, e fluxo completo do backup a 320/390/768/1440 px. Inclui senha divergente, clique duplicado, criptografia/download, conferência de arquivo salvo, senha errada, navegação/limpeza e falha de RPC.
- Testes reais em transação aprovados: professor/aluno ativo e inativo; proteção de notas; metadados editáveis não concedem papel; ativação administrativa por e-mail confirmado e allowlist consumida; negação de anônimo; PDF substituível; recuperação temporária de 17 tabelas com igualdade de conteúdo e verificação de vínculos. Todos os dados sintéticos revertidos por ROLLBACK.
- Advisors: eliminados avisos de funções SECURITY DEFINER públicas executáveis por authenticated. Allowlist administrativa permanece intencionalmente fechada por RLS sem política permissiva. Aviso de senha vazada segue pendente de configuração da plataforma.
- Nenhum arquivo real existe nos buckets no momento da auditoria; cópia/integridade de bytes foi testada com arquivo binário sintético. Não foi criada cópia real fora do servidor: o professor deve salvar e conferir o primeiro `.lgbackup` no painel.
- Revisão feita pelo agente implementador, não uma auditoria independente. Nenhuma conta, treino, avaliação ou arquivo real foi excluído. O layout aprovado foi preservado.
