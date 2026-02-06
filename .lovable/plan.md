
# Plano: Importador de Centros de Custo - Arquitetura Steve Jobs

## Problema Atual

1. **Supabase errado**: O código usa `@/integrations/supabase/client` (Lovable Cloud) em vez de `@/integrations/supabase/external-client`
2. **Fricção desnecessária**: O usuário precisa clicar no card de cada empresa para importar áreas daquela empresa
3. **UI poluída**: Dois botões pequenos dentro de cada card ("Importar" + "Nova Área")
4. **O Excel já tem a informação**: A coluna EMPRESA já identifica a empresa - não precisa de seleção manual

---

## Solução: Um Único Botão Global

### Fluxo Novo (Zero Fricção)

```text
ANTES (3+ cliques por empresa):
┌──────────────────────────────────────────────────────────────┐
│  Configurações → Empresas → Abrir Card → Botão Importar     │
│  → Selecionar Arquivo → Importa apenas para aquela empresa  │
│  → Repetir para cada empresa...                              │
└──────────────────────────────────────────────────────────────┘

DEPOIS (1 clique total):
┌──────────────────────────────────────────────────────────────┐
│  Configurações → Empresas → [Importar Centros de Custo]     │
│  → Seleciona arquivo → Sistema identifica empresas          │
│  → Mostra prévia agrupada por empresa → Importa TUDO        │
└──────────────────────────────────────────────────────────────┘
```

---

## Mudanças na Interface

### 1. Remover Botão "Importar" do CompanyCard

Limpar o card, deixando apenas o botão "Nova Área" para criação manual individual.

### 2. Adicionar Botão Global na Aba Empresas

Ao lado do botão "Nova Empresa", adicionar:

```
[📥 Importar Centros de Custo]
```

### 3. Novo Dialog com Match Automático de Empresas

O sistema irá:
1. Ler a coluna EMPRESA do Excel
2. Fazer match fuzzy com as empresas cadastradas (por `nome` ou `razao_social`)
3. Mostrar prévia agrupada por empresa encontrada
4. Alertar empresas não encontradas

---

## Lógica de Match de Empresas

O arquivo pode ter:
- `J. ARANTES TRANSPORTES E LOGISTICA LTDA.` (razão social)
- `ARANTES TRANSPORTES` (nome fantasia parcial)
- Variações de grafia

### Estratégia de Match (em ordem):

```typescript
function matchEmpresa(nomeExcel: string, empresas: Empresa[]): Empresa | null {
  const normalizado = normalizeString(nomeExcel);
  
  // 1. Match exato por nome
  let match = empresas.find(e => 
    normalizeString(e.nome) === normalizado
  );
  if (match) return match;
  
  // 2. Match exato por razao_social
  match = empresas.find(e => 
    normalizeString(e.razao_social) === normalizado
  );
  if (match) return match;
  
  // 3. Match parcial (nome contém ou está contido)
  match = empresas.find(e => 
    normalizeString(e.nome).includes(normalizado) ||
    normalizado.includes(normalizeString(e.nome)) ||
    normalizeString(e.razao_social).includes(normalizado) ||
    normalizado.includes(normalizeString(e.razao_social))
  );
  if (match) return match;
  
  return null;
}
```

---

## Prévia Agrupada por Empresa

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Prévia da Importação                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ J. ARANTES TRANSPORTES (match: razão social)           │
│     ├─ 82700 - BRK DEPOSITO (novo)                         │
│     ├─ 82701 - BRK OPERACAO (atualizar)                    │
│     └─ 82702 - ADMINISTRATIVO (igual)                      │
│                                                             │
│  ✅ CHOKDOCE (match: nome)                                 │
│     ├─ 10100 - LOJA MATRIZ (novo)                          │
│     └─ 10200 - LOJA 2 (novo)                               │
│                                                             │
│  ⚠️ EMPRESA XYZ LTDA (não encontrada)                      │
│     → 3 registros serão ignorados                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Resumo: 42 novos | 8 atualizações | 5 iguais | 3 erros    │
│                                                             │
│                          [Cancelar]  [Importar 50 registros]│
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/ImportAreasDialog.tsx` | Reescrever completamente para match automático |
| `src/components/admin/CompanyCard.tsx` | Remover botão "Importar" |
| `src/pages/Configuracoes.tsx` | Adicionar botão global + dialog |

### 1. Corrigir Import do Supabase

```typescript
// ANTES (errado)
import { supabase } from "@/integrations/supabase/client";

// DEPOIS (correto)
import { supabase } from "@/integrations/supabase/external-client";
```

### 2. Novo ImportAreasDialog (sem props de empresa)

Interface simplificada:

```typescript
interface ImportAreasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresas: Empresa[]; // Lista de todas as empresas para match
  onSuccess?: () => void;
}

interface PreviewRow {
  empresa_excel: string;      // Nome original do Excel
  empresa_match?: Empresa;    // Empresa encontrada (ou null)
  cost_center: string;
  name: string;
  status: "new" | "update" | "skip" | "error";
  existingId?: string;
  error?: string;
}
```

### 3. Modificar CompanyCard

Remover a seção de importar do card:

```tsx
// REMOVER estas linhas:
<Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
  <Upload className="h-3.5 w-3.5 mr-1" />
  Importar
</Button>

// REMOVER também o estado e dialog relacionados:
// const [importDialogOpen, setImportDialogOpen] = useState(false);
// <ImportAreasDialog ... />
```

### 4. Adicionar na Página Configurações

```tsx
// Na aba empresas, ao lado de "Nova Empresa":
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={() => setImportAreasDialogOpen(true)}>
    <Upload className="h-4 w-4 mr-2" />
    Importar Centros de Custo
  </Button>
  <Button onClick={handleAddCompany}>
    <Plus className="h-4 w-4 mr-2" />
    Nova Empresa
  </Button>
</div>

// Dialog global (passa lista de empresas)
<ImportAreasDialog
  open={importAreasDialogOpen}
  onOpenChange={setImportAreasDialogOpen}
  empresas={empresas}
  onSuccess={() => queryClient.invalidateQueries({ queryKey: ["areas"] })}
/>
```

### 5. Nova Lógica de Análise

```typescript
const analyzeFile = async (file: File) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  // Agrupar por empresa do Excel
  const byEmpresa = new Map<string, PreviewRow[]>();
  
  for (const row of rows) {
    const empresaExcel = String(row["EMPRESA"] || "").trim();
    const costCenter = String(row["CCUSTO"] || "").trim();
    const name = String(row["DESCRIÇÃO CENTRO DE CUSTO"] || "").trim();
    
    if (!costCenter || !name) continue;
    
    // Tentar match com empresas cadastradas
    const empresaMatch = matchEmpresa(empresaExcel, empresas);
    
    // Agrupar
    const grupo = byEmpresa.get(empresaExcel) || [];
    grupo.push({
      empresa_excel: empresaExcel,
      empresa_match: empresaMatch,
      cost_center: costCenter,
      name,
      status: empresaMatch ? "new" : "error",
      error: empresaMatch ? undefined : "Empresa não encontrada"
    });
    byEmpresa.set(empresaExcel, grupo);
  }
  
  // Para cada empresa encontrada, verificar duplicatas
  for (const [empresaExcel, rows] of byEmpresa.entries()) {
    const empresa = rows[0]?.empresa_match;
    if (!empresa) continue;
    
    // Buscar áreas existentes desta empresa
    const { data: existingAreas } = await supabase
      .from("areas")
      .select("id, cost_center, name")
      .eq("company_id", empresa.id);
    
    const existingMap = new Map(
      (existingAreas || []).map(a => [a.cost_center, a])
    );
    
    // Atualizar status de cada row
    for (const row of rows) {
      const existing = existingMap.get(row.cost_center);
      if (existing) {
        row.status = existing.name === row.name ? "skip" : "update";
        row.existingId = existing.id;
      } else {
        row.status = "new";
      }
    }
  }
  
  return byEmpresa;
};
```

---

## Formato do Excel Suportado

| Coluna | Obrigatória | Descrição |
|--------|-------------|-----------|
| EMPRESA | ✅ | Nome ou razão social da empresa |
| CCUSTO | ✅ | Código do centro de custo |
| DESCRIÇÃO CENTRO DE CUSTO | ✅ | Nome da área/setor |

---

## Resultado Final

- **1 botão** em vez de N botões (um por empresa)
- **0 seleção manual** de empresa
- **Prévia agrupada** por empresa com indicadores visuais de match
- **Match inteligente** por nome, razão social ou parcial
- **Alerta claro** quando empresa não é encontrada
- **Supabase correto** (external-client)

---

## Benefícios

| Antes | Depois |
|-------|--------|
| N arquivos (um por empresa) | 1 arquivo único |
| N cliques (abrir cada card) | 1 clique |
| Seleção manual de empresa | Match automático |
| Sem validação de empresa | Alerta de empresas não encontradas |
| UI poluída nos cards | Cards limpos |
