
# Plano de Correção - Página de Notificações e Configurações

## Problemas Identificados

Analisei os logs de console e o código, encontrando dois problemas principais:

### Problema 1: Layout Duplicado na Página de Notificações
A página `Notificacoes.tsx` envolve o conteúdo com `AppLayout` e `OficinaLayout`, mas o `OficinaLayout` já inclui internamente o `AppLayout`. Isso causa um aninhamento duplo de layouts que pode gerar comportamentos visuais estranhos.

**Código atual (linha 101-103):**
```jsx
return (
  <AppLayout>        {/* <- DUPLICADO */}
    <OficinaLayout>  {/* <- Já inclui AppLayout internamente */}
```

### Problema 2: Refs em Function Components (SmtpConfigForm)
Os avisos de console indicam que:
1. O `SmtpConfigForm` não usa `forwardRef` mas está recebendo uma ref do `TabsContent`
2. O componente `Select` do Radix também está gerando warnings similares

Estes são warnings (não erros), mas indicam um pattern incorreto.

---

## Correções Planejadas

### Correção 1: Remover AppLayout duplicado de Notificacoes.tsx

Remover o wrapper `<AppLayout>` pois o `OficinaLayout` já o inclui.

**Antes:**
```jsx
return (
  <AppLayout>
    <OficinaLayout>
      <div className="space-y-6">
        ...
      </div>
    </OficinaLayout>
  </AppLayout>
);
```

**Depois:**
```jsx
return (
  <OficinaLayout>
    <div className="space-y-6">
      ...
    </div>
  </OficinaLayout>
);
```

### Correção 2: Adicionar forwardRef ao SmtpConfigForm

Converter o `SmtpConfigForm` para usar `React.forwardRef` para eliminar o warning de refs.

**Antes:**
```jsx
export function SmtpConfigForm() {
  ...
}
```

**Depois:**
```jsx
export const SmtpConfigForm = React.forwardRef<HTMLDivElement, {}>(
  function SmtpConfigForm(props, ref) {
    ...
    return (
      <Card ref={ref}>
        ...
      </Card>
    );
  }
);
SmtpConfigForm.displayName = "SmtpConfigForm";
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Notificacoes.tsx` | Remover wrapper `<AppLayout>` duplicado |
| `src/components/SmtpConfigForm.tsx` | Adicionar `forwardRef` para eliminar warning de refs |

---

## Detalhes Técnicos

### Por que o layout estava duplicado?
O `OficinaLayout` foi desenhado como um wrapper completo que já inclui o `AppLayout` internamente (linha 26 e 82 de OficinaLayout.tsx). Outras páginas do módulo Oficina como `Agenda.tsx`, `Lavagens.tsx` e `KmColetas.tsx` não têm esse problema porque já usam apenas o `OficinaLayout`.

### Por que o warning de refs aparece?
O Radix UI `TabsContent` tenta passar uma ref para seus children diretos. Quando o child é um function component sem `forwardRef`, o React gera um warning. A solução é envolver o componente com `forwardRef`.

---

## Resultado Esperado
- Página de Notificações renderiza corretamente sem layouts duplicados
- Console limpo sem warnings de refs
- Funcionalidade mantida integralmente
