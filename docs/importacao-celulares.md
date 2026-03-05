# Importação de Ativos — Celulares

A tela **Ativos** possui uma importação em massa (CSV/XLSX) específica para o tipo **Celular**.

## Template

- Template CSV pronto para download na UI: `/templates/import-celulares-template.csv`
- Colunas obrigatórias:
  - `modelo`
  - `imei`

## Regras

- O sistema cria um ativo com nome `Celular {modelo}`.
- O IMEI é normalizado para conter apenas dígitos.
- Duplicidade:
  - IMEI duplicado no arquivo é ignorado.
  - IMEI já existente em `assets.imei` (ativo) é ignorado.
- Campos não informados são atribuídos como `null`.
- Status inicial: `disponivel`.

## Exemplo

```csv
modelo,imei
"iPhone 14",123456789012345
"Samsung Galaxy S23",987654321098765
```
