# Anamnese em sete grupos

## Comparação e plano

O formulário anterior tinha 15 campos narrativos, sono e PAR-Q. Faltavam perguntas específicas de identificação, experiência, prioridades, cirurgias, rotina, hábitos e aderência. O modelo fornecido pelo professor foi usado como referência para as perguntas, sem cadastrar as respostas do exemplo nem criar um aluno novo.

1. Comparar todas as perguntas com o cadastro, portal e painel existentes.
2. Criar uma definição compartilhada com 48 perguntas em sete grupos: identificação; histórico de treinamento; objetivos; saúde, dores e lesões; rotina; alimentação e hábitos; preferências e aderência.
3. Manter as sete questões PAR-Q e a revisão obrigatória antes de salvar.
4. Aplicar a mesma definição ao cadastro (sete etapas), área do aluno e duas visualizações do professor (perfil e modal).
5. Gravar os novos campos em `anamneses.answers` JSONB com `questionnaire_version: 2`, mantendo as colunas antigas para compatibilidade.
6. Testar envio, leitura, edição, preservação de dados anteriores, isolamento, mobile e confirmação/reenvio; publicar via PR.

## Decisões

- Data de nascimento é a fonte; idade não é armazenada como número que envelhece.
- Altura em centímetros, peso em kg, água em litros e refeições por dia têm unidades explícitas. Altura/peso são declarados pelo aluno e não geram avaliação física.
- Perguntas sem resposta ficam como “Não informado”, sem converter ausência em “Não”. Objetivo, PAR-Q e revisão continuam obrigatórios; informações complementares podem ser respondidas depois.
- Cirurgias, medicamentos, suplementos e hábitos permitem detalhes. Frequência e duração de treino são campos narrativos, aceitando respostas em dias/semana e horas/minutos.
- Informações do perfil podem preencher identificação quando não há resposta salva. Editar a anamnese não altera automaticamente o cadastro de acesso.
- Perguntas acrescentadas ficam sem resposta em registros antigos. Não é possível reconstruir respostas que nunca foram coletadas.
- Nenhuma tabela, política RLS ou permissão nova foi necessária. Saúde permanece no registro protegido de anamnese; não vai para Auth metadata nem armazenamento local.
- A confirmação de e-mail e a retomada de envio corrigidas anteriormente continuam funcionando. Falha ou gravação não confirmada não mostram sucesso.
- IDs do aluno vêm da identidade autenticada, nunca do formulário. Retry usa o mesmo UUID; professor vê o registro atualizado mais recente.

## Compatibilidade e verificação

Campos antigos são preenchidos a partir de suas colunas ou JSONB. Ao editar, dados adicionais desconhecidos do formulário antigo são preservados; campos explicitamente apagados não reaparecem a partir de valores antigos.

Testes específicos cobrem as 48 perguntas, tipos, unidades, valores ausentes, limites, XSS, preservação de legado e gravação sob o aluno autenticado. Integração DOM usa API/modelo real do portal e a tela real do professor, salvando, relendo e editando respostas sintéticas. A QA SQL no projeto usa apenas identidades sintéticas e ROLLBACK, incluindo JSONB/valores apagados, retry e isolamento. CI executa também o cadastro em Chromium nas larguras 320/390/768/1440 e todos os testes de regressão existentes.

Layout e identidade LG preservados; apenas organização das perguntas e controles necessários ao questionário foram alterados.
