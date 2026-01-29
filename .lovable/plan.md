

# Plano: Adicionar Ação de Devolver Ativo

## Objetivo

Adicionar um botão de ação "Devolver" na lista de ativos que:
1. Remove o funcionário responsável (funcionario_id = null)
2. Altera o status para "disponível"
3. O histórico é registrado automaticamente pelo trigger existente

## Situação Atual

- A tabela de ativos tem botões de: Histórico, Editar e Excluir
- O hook `useAtivos` tem: createAtivo, updateAtivo, deleteAtivo
- Existe um trigger `log_asset_assignment_change` que registra automaticamente mudanças de responsável

## Implementação

### 1. Hook useAtivos - Adicionar Mutation `devolverAtivo`

```typescript
const devolverAtivo = useMutation({
  mutationFn: async (id: string) => {
    const { data, error } = await supabase
      .from("assets")
      .update({ 
        funcionario_id: null,
        status: "disponivel"
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["ativos"] });
    toast.success("Ativo devolvido com sucesso!");
  },
  onError: (error) => {
    toast.error("Erro ao devolver ativo: " + error.message);
  },
});
```

### 2. Página Ativos - Adicionar Botão de Devolver

Adicionar botão com ícone de "Undo2" (seta de retorno) na coluna de ações, **visível apenas para ativos com funcionário atribuído**.

```tsx
{(ativo as any).funcionario?.nome && (
  <Button 
    variant="ghost" 
    size="icon" 
    title="Devolver ativo"
    onClick={() => handleDevolverAtivo(ativo)}
  >
    <Undo2 className="h-4 w-4 text-orange-500" />
  </Button>
)}
```

### 3. Handler de Devolução

```typescript
const handleDevolverAtivo = async (ativo: typeof ativos[0]) => {
  await devolverAtivo.mutateAsync(ativo.id);
};
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAtivos.ts` | Adicionar mutation `devolverAtivo` |
| `src/pages/Ativos.tsx` | Importar `Undo2`, adicionar handler e botão de devolução |

## Fluxo Completo

```text
┌─────────────────────────────────────────────────────────────┐
│  Usuário clica em "Devolver"                                │
│           ↓                                                 │
│  updateAtivo({ funcionario_id: null, status: 'disponivel'}) │
│           ↓                                                 │
│  Trigger 'log_asset_assignment_change' detecta mudança      │
│           ↓                                                 │
│  Registro automático na tabela 'atribuicoes'                │
│           ↓                                                 │
│  Ativo aparece como "Disponível" sem responsável            │
└─────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

1. Botão "Devolver" aparece apenas em ativos com funcionário atribuído
2. Ao clicar, o ativo é imediatamente liberado (funcionario_id = null, status = disponível)
3. O histórico de atribuição é atualizado automaticamente pelo trigger
4. Toast de sucesso confirma a operação

