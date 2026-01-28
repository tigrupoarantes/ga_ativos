
# Remover Equipes das Configuracoes

## Objetivo
Eliminar duplicidade - Equipes agora tem acesso direto no menu lateral (Pessoas > Equipes), tornando desnecessario manter a gestao inline nas Configuracoes.

## Alteracoes

### Arquivo: `src/pages/Configuracoes.tsx`

1. **Remover import** (linha 12):
   ```typescript
   // REMOVER:
   import { EquipesInlineManager } from "@/components/EquipesInlineManager";
   ```

2. **Remover componente do JSX** (linhas 65-71):
   ```typescript
   // ANTES:
   {isAdmin && (
     <>
       <EmpresasInlineManager />
       <EquipesInlineManager />  // REMOVER
     </>
   )}
   
   // DEPOIS:
   {isAdmin && <EmpresasInlineManager />}
   ```

## Resultado
- Configuracoes mantem apenas a gestao de **Empresas** (que nao tem pagina propria)
- **Equipes** continua acessivel via menu Pessoas > Equipes
- Interface mais limpa e sem duplicidade
