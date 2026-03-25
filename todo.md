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
