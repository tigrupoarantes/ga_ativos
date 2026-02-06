
# Plano: Corrigir Lógica de Importação de Funcionários

## Problema Identificado

A lógica atual nas **linhas 861-897** do arquivo `ImportFuncionariosDialog.tsx` executa uma **sincronização destrutiva silenciosa**:

```text
Fluxo Atual (PROBLEMÁTICO):
1. Processa cada linha do CSV (atualiza/insere/inativa conforme marcado)
2. DEPOIS, busca TODOS os funcionários ativos do banco
3. Inativa TODOS que não estão na planilha
4. Libera TODOS os ativos vinculados a esses funcionários
5. NÃO mostra isso na prévia - o usuário só descobre depois
```

**Resultado**: Uma planilha de atualização parcial (ex: 92 funcionários) inativa os outros 600+ que não foram incluídos.

---

## Solução Proposta

### 1. Adicionar Modo de Importação

Dar ao usuário a **escolha explícita** entre dois modos:

| Modo | Comportamento | Quando Usar |
|------|---------------|-------------|
| **Apenas Atualizar** (padrão) | Processa apenas os registros do CSV. Quem não está na planilha permanece inalterado. | Atualizações parciais, correções de dados |
| **Sincronização Total** | Inativa funcionários que não estão na planilha. | Carga completa do RH |

### 2. Mostrar na Prévia Quem Será Inativado

Se o usuário escolher "Sincronização Total":
- Buscar todos os funcionários ativos do banco durante a análise
- Comparar com os CPFs da planilha
- Mostrar **lista completa** de quem será inativado
- Exibir **alerta vermelho destacado** com contagem e nomes

### 3. Reativar Funcionários Automaticamente

Se um CPF já existe no banco como **inativo** e está na planilha como **ativo**:
- Reativar o funcionário (`active = true`)
- Atualizar seus dados
- Não perder o histórico

---

## Alterações Técnicas

### Arquivo: `src/components/ImportFuncionariosDialog.tsx`

#### A. Novos Estados

```typescript
const [importMode, setImportMode] = useState<'update-only' | 'full-sync'>('update-only');
const [toDeactivateList, setToDeactivateList] = useState<Array<{id: string, cpf: string, nome: string}>>([]);
```

#### B. Modificar `analyzePreview` (linhas 516-679)

Adicionar busca de funcionários que serão inativados (apenas se modo = full-sync):

```typescript
// Buscar TODOS os funcionários ativos para comparar
const { data: allActiveEmployees } = await supabase
  .from('funcionarios')
  .select('id, cpf, nome')
  .eq('active', true);

// Identificar quem não está na planilha
const csvCpfs = new Set(rows.map(r => normalizeCpf(r.cpf)));
const willDeactivate = (allActiveEmployees || []).filter(emp => 
  !csvCpfs.has(normalizeCpf(emp.cpf || ''))
);

setToDeactivateList(willDeactivate);
```

#### C. Adicionar Seletor de Modo na UI (antes das abas de prévia)

```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <Label className="text-sm font-medium flex items-center gap-2">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    Modo de Importação
  </Label>
  <RadioGroup value={importMode} onValueChange={setImportMode} className="mt-2">
    <div className="flex items-start space-x-2">
      <RadioGroupItem value="update-only" id="update-only" />
      <div>
        <Label htmlFor="update-only" className="font-medium">
          Apenas Atualizar/Inserir (Recomendado)
        </Label>
        <p className="text-xs text-muted-foreground">
          Processa apenas os registros do CSV. Funcionários que não estão 
          na planilha permanecem inalterados.
        </p>
      </div>
    </div>
    <div className="flex items-start space-x-2 mt-2">
      <RadioGroupItem value="full-sync" id="full-sync" />
      <div>
        <Label htmlFor="full-sync" className="font-medium text-destructive">
          Sincronização Total (Cuidado!)
        </Label>
        <p className="text-xs text-muted-foreground">
          Funcionários que não estão na planilha serão INATIVADOS e seus 
          ativos serão liberados.
        </p>
      </div>
    </div>
  </RadioGroup>
</div>
```

#### D. Adicionar Alerta de Inativação

Se modo = "full-sync" e há funcionários a inativar:

```tsx
{importMode === 'full-sync' && toDeactivateList.length > 0 && (
  <Alert variant="destructive" className="border-2">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle className="text-base">
      ATENÇÃO: {toDeactivateList.length} funcionários serão INATIVADOS!
    </AlertTitle>
    <AlertDescription>
      <p className="mb-2">
        Estes funcionários não constam na planilha e serão desativados, 
        liberando todos os ativos vinculados:
      </p>
      <ScrollArea className="h-[120px] border rounded bg-destructive/5 p-2">
        <ul className="text-xs space-y-1">
          {toDeactivateList.map(emp => (
            <li key={emp.id} className="flex justify-between">
              <span>{emp.nome}</span>
              <span className="font-mono text-muted-foreground">{emp.cpf}</span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </AlertDescription>
  </Alert>
)}
```

#### E. Modificar `processImport` (linhas 861-897)

Condicionar a lógica de inativação ao modo selecionado:

```typescript
// STEP 2: Deactivate ONLY if full-sync mode is selected
if (importMode === 'full-sync') {
  const importedCpfs = new Set<string>();
  previewData.forEach(row => {
    const cpf = normalizeCpf(row.cpf);
    if (cpf && cpf.length === 11) {
      importedCpfs.add(cpf);
    }
  });
  
  // ... resto do código de inativação existente ...
}
// Se importMode === 'update-only', pula completamente esta seção
```

#### F. Garantir Reativação de Funcionários Inativos

Na lógica de processamento (linhas 833-852), verificar se o funcionário existente está inativo e reativá-lo:

```typescript
if (existing) {
  // Garantir que funcionários inativos sejam reativados
  updateData.active = true;
  
  const { error } = await supabase
    .from('funcionarios')
    .update(updateData)
    .eq('id', existing.id);
  
  if (error) throw error;
  
  // Contabilizar reativação separadamente
  if (!existing.active) {
    result.reactivated++;
  } else {
    result.updated++;
  }
}
```

---

## Novo Fluxo de Importação

```text
ANTES (Problemático):
┌─────────────────────────────────────────────────────────────┐
│ CSV enviado → Processa linhas → INATIVA TODOS OS OUTROS    │
│                                 (silenciosamente!)          │
└─────────────────────────────────────────────────────────────┘

DEPOIS (Seguro):
┌─────────────────────────────────────────────────────────────┐
│ CSV enviado → Escolhe modo → Mostra prévia completa        │
│                                                             │
│ Modo "Apenas Atualizar":                                    │
│   → Processa apenas linhas do CSV                           │
│   → Funcionários ausentes: NÃO ALTERA                       │
│                                                             │
│ Modo "Sincronização Total":                                 │
│   → Mostra QUEM será inativado antes de confirmar          │
│   → Exige confirmação explícita                             │
│   → Só então executa a inativação                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Comportamento Esperado

| Cenário | Modo "Apenas Atualizar" | Modo "Sincronização Total" |
|---------|------------------------|---------------------------|
| CPF na planilha (ativo) | Atualiza dados | Atualiza dados |
| CPF na planilha (inativo no banco) | **Reativa** + atualiza | **Reativa** + atualiza |
| CPF NÃO na planilha | **NÃO ALTERA** | **Inativa** (com aviso prévio) |
| Prévia mostra inativações? | N/A | **SIM, lista completa** |

---

## Resumo das Mudanças

1. **Modo padrão = "Apenas Atualizar"** - seguro por design
2. **Usuário escolhe explicitamente** se quer sincronização total
3. **Prévia mostra EXATAMENTE quem será inativado** antes de confirmar
4. **Alerta vermelho destacado** com lista de nomes
5. **Funcionários inativos são reativados** se aparecem na planilha
6. **Nunca mais surpresas** com inativações em massa

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ImportFuncionariosDialog.tsx` | Todas as mudanças descritas acima |

---

## Dependências de UI

- `RadioGroup` e `RadioGroupItem` (já disponíveis em `@/components/ui/radio-group`)
- `Alert`, `AlertTitle`, `AlertDescription` (já disponíveis em `@/components/ui/alert`)
- Ícone `AlertTriangle` do lucide-react

