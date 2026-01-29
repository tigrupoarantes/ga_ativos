

# Plano: Adicionar Número de Série na Busca de Ativos

## Situação Atual

O campo de busca na página de Ativos filtra por:
- Nome
- Patrimônio  
- Marca

Mas **não inclui o número de série** conforme solicitado.

## Mudança Necessária

Adicionar `numero_serie` ao filtro existente.

## Código Atual (linha 60-65)

```typescript
const filteredAtivos = ativos.filter(
  (a) =>
    a.nome?.toLowerCase().includes(search.toLowerCase()) ||
    a.patrimonio?.toLowerCase().includes(search.toLowerCase()) ||
    a.marca?.toLowerCase().includes(search.toLowerCase())
);
```

## Código Corrigido

```typescript
const filteredAtivos = ativos.filter(
  (a) =>
    a.nome?.toLowerCase().includes(search.toLowerCase()) ||
    a.patrimonio?.toLowerCase().includes(search.toLowerCase()) ||
    a.numero_serie?.toLowerCase().includes(search.toLowerCase())
);
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Ativos.tsx` | Substituir `a.marca` por `a.numero_serie` no filtro |

## Resultado

Após a mudança, o campo de busca encontrará ativos por:
- Nome do ativo
- Número do patrimônio (ex: NTB-2600024)
- Número de série

