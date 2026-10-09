# Correção de responsividade — 08/10/2026

## Diagnóstico e plano

Print identifica painel administrativo/perfil do aluno, não o portal claro do aluno. Meta viewport já existia. O problema principal era min-content automático: .shell tinha coluna 1fr sem minmax(0,1fr), blocos flex/grid não tinham min-width:0 e abas/botões/textos longos alargavam a página. Também havia formulários em grids inline e tabelas sem contenção local.

1. Restringir grids/flex à largura real, sem esconder overflow do body.
2. Empilhar perfil, cartões, botões e formulários no celular; manter navegação/tabelas em scroll local quando necessário.
3. Auditar as seis páginas: pública, admin, portal, cadastro, senha e ativação administrativa.
4. Automatizar renderização Chromium em 320/390/430/768/1440px com conteúdos sintéticos e CSS dos módulos carregados tardiamente.
5. Regressões, PR, revisão, merge, publicação e conferência de arquivos.

## Implementação e revisão

responsive.css é compartilhado pelas seis páginas; responsive.js cria uma região acessível para tabelas largas, incluindo as renderizadas após navegação. O observador ignora tabelas já envolvidas, evitando nesting ou loops. Não se usa overflow-x:hidden para disfarçar cortes. Texto longo pode quebrar, grids podem encolher e campos no celular têm 16px para evitar zoom automático do iOS.

Perfil do professor: abas em duas colunas no celular, cards e informações em uma coluna, ações quebram linha, modal limitado à janela e formulários inline empilhados. Desktop conserva sidebar e visual escuro LG. Portal conserva visual claro, nav horizontal e tabelas. Cadastro mantém nascimento em três campos e reorganiza PAR-Q. Página pública/login e senha têm limites adequados de largura.

Não foram alterados autenticação, armazenamento, dados, regras de treino, permissões ou funções Supabase. Mudanças são CSS, contenção das tabelas e carregamento desses arquivos. CSS compartilhado tem seletores específicos suficientes para prevalecer sobre estilos de módulos injetados depois.

Direção visual permanece a existente do projeto, sem importação de layout de outro site: mesma identidade, componentes e ordem. Revisão de similaridade não encontrou fonte externa copiada. Acessibilidade: textos não cortados, botões principais com altura mínima 44px no celular, scroll de tabela com foco/label, zoom permitido.

## Validação

164 regressões Node passaram localmente. Integração DOM e testes reais de layout fazem parte do CI. responsive-browser.check.mjs verifica largura do documento e limites do main/modal em cinco viewports, seis páginas, todas as etapas de cadastro, janela de login, perfil com nomes/e-mails/planos longos e tabelas contidas. Auth/banco não são acessados: fixtures sintéticas e recursos locais, nenhum dado do aluno do print é usado.

O Chromium não substitui a conferência em Safari físico. Após publicação, abrir o site atualizado no iPhone e conferir perfil, treino e formulários. Manter zoom normal; se estiver em modo “site para computador”, voltar ao modo móvel. Não desativamos zoom nem controles do navegador.
