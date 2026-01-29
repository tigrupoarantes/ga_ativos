
# Plano: Corrigir Erro de UUID e Ajustar Formulário de Edição

## Problemas Identificados

### Problema 1: Erro `invalid input syntax for type uuid: ""`
Quando o formulário de edição é enviado, campos UUID opcionais (`funcionario_id`, `empresa_id`, `tipo_id`) são enviados como strings vazias `""` em vez de `null`. O PostgreSQL rejeita strings vazias como UUIDs inválidos.

**Localização do erro (linha 72-81 de Ativos.tsx):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  if (editingId) {
    await updateAtivo.mutateAsync({ id: editingId, ...formData }); // formData contém ""
  }
};
```

### Problema 2: Formulário de Edição Incompleto para Notebooks
O formulário de edição está faltando campos importantes:
- Data de Aquisição
- Valor de Aquisição

Esses campos são importantes para notebooks existentes que precisam ter suas informações atualizadas.

---

## Solução

### 1. Converter Strings Vazias para `null` Antes do Envio

Modificar `handleSubmit` em `Ativos.tsx` para sanitizar campos UUID:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (editingId) {
    // Converter strings vazias para null em campos UUID
    const sanitizedData = {
      ...formData,
      funcionario_id: formData.funcionario_id || null,
      empresa_id: formData.empresa_id || null,
      tipo_id: formData.tipo_id || null,
    };
    await updateAtivo.mutateAsync({ id: editingId, ...sanitizedData });
  }
  // ...
};
```

### 2. Adicionar Campos Faltantes no Formulário de Edição

Adicionar ao formulário de edição (dentro de `renderDialogContent`):
- Data de Aquisição (tipo: date)
- Valor de Aquisição (tipo: number)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Ativos.tsx` | Sanitizar UUIDs + adicionar campos de aquisição |

---

## Detalhes Técnicos

### Mudança 1: handleSubmit (linha 72-81)
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (editingId) {
    const sanitizedData = {
      ...formData,
      funcionario_id: formData.funcionario_id || null,
      empresa_id: formData.empresa_id || null,
      tipo_id: formData.tipo_id || null,
      valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao as string) : null,
    };
    await updateAtivo.mutateAsync({ id: editingId, ...sanitizedData });
  } else {
    await createAtivo.mutateAsync(formData);
  }
  setIsDialogOpen(false);
  resetForm();
};
```

### Mudança 2: Estado do Formulário (linha 45-58)
Adicionar campos faltantes:
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  data_aquisicao: "",
  valor_aquisicao: "",
});
```

### Mudança 3: handleEdit (linha 102-119)
Carregar campos adicionais:
```typescript
setFormData({
  // ... campos existentes
  data_aquisicao: ativo.data_aquisicao || "",
  valor_aquisicao: ativo.valor_aquisicao?.toString() || "",
});
```

### Mudança 4: Formulário de Edição (adicionar após IMEI, ~linha 240)
```jsx
<div className="space-y-2">
  <Label htmlFor="data_aquisicao">Data de Aquisição</Label>
  <Input
    id="data_aquisicao"
    type="date"
    value={formData.data_aquisicao}
    onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
  />
</div>
<div className="space-y-2">
  <Label htmlFor="valor_aquisicao">Valor de Aquisição (R$)</Label>
  <Input
    id="valor_aquisicao"
    type="number"
    step="0.01"
    value={formData.valor_aquisicao}
    onChange={(e) => setFormData({ ...formData, valor_aquisicao: e.target.value })}
  />
</div>
```

---

## Resultado Esperado

1. Atribuição e desatribuição de funcionários funciona sem erro
2. Formulário de edição exibe e permite alterar data e valor de aquisição
3. Campos UUID vazios são convertidos para `null` corretamente
