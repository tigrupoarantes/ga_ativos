

# Plano: Alterar Status Automaticamente ao Associar Funcionário

## Problema Identificado

Ao editar um ativo e associar um funcionário, o status permanece como "disponivel" em vez de mudar para "em_uso" automaticamente. Os formulários específicos (NotebookForm, CelularForm) já implementam essa lógica, mas o formulário de edição principal em `Ativos.tsx` não.

## Comparação

| Formulário | Lógica Implementada |
|------------|---------------------|
| NotebookForm | `const status = formData.funcionario_id ? "em_uso" : "disponivel"` |
| CelularForm | `const status = formData.funcionario_id ? "em_uso" : "disponivel"` |
| Ativos.tsx (edição) | Status não é alterado automaticamente |

## Solução

Modificar a função `handleSubmit` em `Ativos.tsx` para determinar o status automaticamente baseado na presença de `funcionario_id`:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Determinar status automaticamente baseado no funcionário
  const autoStatus = formData.funcionario_id ? "em_uso" : "disponivel";
  
  // Sanitizar campos UUID vazios para null e converter tipos
  const sanitizedData = {
    ...formData,
    funcionario_id: formData.funcionario_id || null,
    empresa_id: formData.empresa_id || null,
    tipo_id: formData.tipo_id || null,
    valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null,
    data_aquisicao: formData.data_aquisicao || null,
    status: autoStatus, // Status automático
  };
  
  if (editingId) {
    await updateAtivo.mutateAsync({ id: editingId, ...sanitizedData });
  } else {
    await createAtivo.mutateAsync(sanitizedData);
  }
  setIsDialogOpen(false);
  resetForm();
};
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Ativos.tsx` | Adicionar lógica de status automático em `handleSubmit` |

## Comportamento Esperado

| Ação | Status Resultante |
|------|-------------------|
| Criar/editar ativo **com** funcionário | `em_uso` |
| Criar/editar ativo **sem** funcionário | `disponivel` |
| Devolver ativo (botão existente) | `disponivel` |

## Fluxo Completo

```text
Usuário edita ativo
        ↓
Seleciona funcionário no combobox
        ↓
handleSubmit detecta funcionario_id presente
        ↓
Define status = "em_uso" automaticamente
        ↓
Ativo aparece na lista com badge "Em Uso"
```

