# Plano de execução — área do aluno

## Base estudada

Documentos de arquitetura, funcionalidades, banco, segurança/LGPD, treino Lucas e pendências do ZIP. Login, gestão de planos, importação e definição de senha já funcionam. O portal atual tem seis cartões e somente fotos de evolução conectadas. O banco oferece dados e RLS para os módulos abaixo.

## Escopo e utilidade

| Área | Entrega para o aluno |
|---|---|
| Início | Plano ativo, sessões recentes, última avaliação e pendência de anamnese; atalhos claros |
| Meu treino | Planos ativos e antigos, treinos A–E, séries/repetições/RIR/descanso, execução e notas; ficha A4 |
| Sessões | Registro de séries, carga, repetições e RIR reais; observações; histórico paginado e detalhes |
| Avaliações | Resultados registrados, composição, medidas, força, VO₂ estimado, estágios e PDF privado; relatório imprimível |
| Evolução | Histórico de peso/composição, gráfico acessível e tabela; fotos privadas e comparação por data/ângulo |
| Anamnese | Preencher, consultar e atualizar contexto/rotina/saúde/PAR-Q na própria conta |
| Orientações | Ler orientações que o professor registrou para aquele aluno |
| Perfil | Consultar cadastro, editar nome/telefone/nascimento/sexo e alterar a própria senha |

Notas student_followups permanecem privadas do professor e não serão consultadas. Observations do cadastro não será exibida. Nenhuma fórmula clínica será refeita no portal; resultados são os registrados pelo professor. Catálogo completo de mídia, pagamentos e integrações externas permanecem etapas futuras; não são requisitos do portal com os dados atuais.

## Implementação

1. Separar portal.html, portal.css, modelo/API e controlador de telas. Layout LG com navegação para desktop/celular, foco visível e estados de carregamento/erro/vazio.
2. Usar identidade verificada por Auth e RLS em toda consulta. Documentos/fotos em buckets privados com URLs temporárias.
3. Criar RPC transacional de sessão com chave idempotente, validação de dono do treino/plano ativo, exercícios pertencentes ao treino e números válidos. Corrigir políticas de sessões/séries para não aceitar referências de outro treino/aluno.
4. Perfil editável por função de servidor com whitelist e identidade do solicitante; não permitir alterar papel, ativação, e-mail ou notas profissionais.
5. Anamnese com campos compatíveis com o onboarding, confirmação de revisão das informações, erro visível e conteúdo preservado.
6. Imprimir treino e avaliação em A4 pelo navegador; downloads privados de bioimpedância sem tornar buckets públicos.
7. Testar validações, formulários, queries, erros, idempotência, isolamento RLS, proteção dos arquivos e regressões. Usar dados sintéticos em transação revertida para testes SQL.
8. Issue → branch → PR → revisão → testes CI → merge → deploy; conferir arquivos publicados e informar roteiro de teste com aluno real.

## Critérios de aceite

- Todos os itens de navegação abrem um módulo funcional, com mensagem quando não houver dados.
- Aluno acessa somente seus dados e não altera prescrição/avaliações/permissões.
- Sessão e séries são gravadas juntas; repetição da mesma chave não duplica sessão.
- Falhas não mostram sucesso; formulários preservam dados e liberam controles.
- Planos inativos disponíveis como histórico, sem botão de registrar treino novo.
- Nenhuma senha, token, foto ou dado de saúde fica em armazenamento local criado pelo portal.
- Relatórios exibem valores e unidades registrados; VO₂ identificado como estimativa.

## Limites da validação

Testes automatizados de UI usam doubles das chamadas Auth/Storage. Dados reais não serão alterados para testar. O fluxo autenticado no navegador do aluno e a impressão final precisam de conferência na sessão real após publicação; isso será distinguido dos testes de código/banco.
