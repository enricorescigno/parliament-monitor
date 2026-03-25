# Parliament Monitor — TODO

## Database & Schema
- [x] Schema: parliamentarians table
- [x] Schema: expenses table
- [x] Schema: assets table
- [x] Schema: contracts table
- [x] Schema: employees table
- [x] Schema: analysis_history table
- [x] Schema: audit_reports table
- [x] Run migrations

## Backend / API
- [x] Seed realistic mock data for parliamentarians
- [x] tRPC: search parliamentarian by CPF/name
- [x] tRPC: get parliamentarian detail
- [x] tRPC: calculate trust score
- [x] tRPC: ghost employee analysis
- [x] tRPC: asset incompatibility analysis
- [x] tRPC: suspicious contracts analysis
- [x] tRPC: LLM narrative report generation
- [x] tRPC: list recent searches / history

## Frontend — Design System
- [x] Brutalist typography CSS (heavy sans-serif, stark black/white)
- [x] Global layout with thick geometric lines, brackets, asymmetry
- [x] Responsive grid system

## Frontend — Pages
- [x] Landing page with CPF search hero
- [x] Search results page
- [x] Parliamentarian profile page (overview)
- [x] Trust score dashboard with gauge and breakdown
- [x] Ghost employees module page
- [x] Asset incompatibility module page
- [x] Suspicious contracts module page
- [x] LLM report page
- [x] 404 page

## Frontend — Charts & Visualizations
- [x] Trust score radial gauge
- [x] Asset evolution line chart
- [x] Expenses by category bar chart
- [x] Contract timeline chart
- [x] Ghost employee risk heatmap
- [x] Score breakdown radar chart

## Tests
- [x] Unit tests for score calculation
- [x] Unit tests for CPF validation
- [x] Unit tests for tRPC procedures

## Kim Kataguiri — Adição de Parlamentar Real
- [x] Pesquisar dados públicos reais do Kim Kataguiri (TSE, Câmara)
- [x] Cadastrar parlamentar no banco de dados
- [x] Inserir despesas, patrimônio, funcionários e contratos baseados em dados reais
- [x] Calcular trust score

## Integração Automática com APIs Públicas
- [x] Explorar e testar API da Câmara dos Deputados (dadosabertos.camara.leg.br)
- [x] Explorar e testar API do Senado Federal (legis.senado.leg.br/dadosabertos)
- [x] Explorar dados abertos do TSE (dadosabertos.tse.jus.br)
- [x] Implementar serviço de sync no backend: importar deputados federais (737)
- [x] Implementar serviço de sync no backend: importar senadores (83)
- [x] Implementar importação de despesas/cotas parlamentares via API Câmara
- [x] Implementar importação de patrimônio via dados TSE
- [x] Criar endpoint tRPC para disparar sincronização manual
- [x] Criar painel de status de sincronização no frontend
- [x] Executar importação inicial completa
- [ ] Agendar sincronização periódica automática (roadmap)

## Dados Reais nos Perfis
- [x] Importar despesas reais via API Câmara para todos os deputados
- [x] Sync automático na inicialização do servidor
- [x] Exibir dados reais de despesas, funcionários e patrimônio nos perfis

## Correções do Diagnóstico
- [x] BUG 1: Adicionar coluna notes ao trust_scores (schema + migration + SQL)
- [x] BUG 2: Home.tsx — substituir FEATURED hardcoded por query tRPC dinâmica
- [x] BUG 3: syncLogs — salvar logId real e usar no update final
- [x] BUG 4: syncExpensesForAll — verificar despesas por ano corrente, não total
- [x] BUG 5: getDb() — usar connection pool em vez de conexão única
- [x] BUG 6: runStartupSync — adicionar lock para evitar syncs paralelos
- [x] BUG 7: Home.tsx — buscar scores reais do banco para os destaques
- [x] BUG 8: SearchResults.tsx — buscar trust score para todos os resultados
