
## Plano: Limpeza de Funcionários Duplicados

### Diagnóstico Completo

| Situação Atual | Valor |
|----------------|-------|
| Total funcionários ativos | 1.286 |
| Total esperado | ~850 |
| Funcionários únicos por nome | 1.250 |
| Nomes com duplicatas | 35 |
| Registros duplicados | 71 (36 a remover) |
| Duplicados com ativos atribuídos | 16 |

### Causa Raiz

As duplicatas são causadas principalmente por **CPFs sem zero à esquerda**:
- Exemplo: `4716454274` e `04716454274` são tratados como diferentes
- Durante importações CSV, o sistema criou novos registros ao invés de atualizar

### Solução em 3 Etapas

---

#### Etapa 1: Normalizar CPFs Existentes

Padronizar todos os CPFs para 11 dígitos com zeros à esquerda.

```sql
-- Normalizar CPFs para 11 dígitos
UPDATE funcionarios 
SET cpf = LPAD(cpf, 11, '0')
WHERE cpf IS NOT NULL 
  AND cpf != '' 
  AND LENGTH(cpf) < 11;
```

---

#### Etapa 2: Consolidar Duplicatas

Para cada grupo de funcionários duplicados:
1. **Manter** o registro que tem atribuições (ativos, veículos, linhas)
2. **Transferir** atribuições do duplicado para o registro principal (se houver)
3. **Desativar** os registros duplicados

```sql
-- Script de consolidação (a ser executado com cuidado)
-- 1. Primeiro, identificar qual registro manter por grupo
-- 2. Transferir atribuições para o registro principal
-- 3. Desativar duplicatas
```

---

#### Etapa 3: Prevenir Futuras Duplicatas

Modificar a lógica de importação para:
1. Sempre normalizar CPF para 11 dígitos antes de buscar/inserir
2. Usar `LPAD(cpf, 11, '0')` na comparação

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/ImportFuncionariosDialog.tsx` | Normalizar CPF antes de comparar/inserir |

### Scripts SQL a Executar

Fornecerei os scripts SQL seguros para:
1. Normalizar todos os CPFs
2. Consolidar duplicatas preservando atribuições
3. Desativar registros duplicados

---

### Etapa Adicional: Verificar Diferença de ~400 Funcionários

Se após remover as 36 duplicatas ainda houver ~400 funcionários a mais:
- Será necessário uma nova importação com a lista atualizada de funcionários ativos
- A importação marcará automaticamente como inativos os que não constarem na planilha

---

### Resumo das Ações

1. Executar script SQL para normalizar CPFs
2. Executar script SQL para consolidar duplicatas (preservando atribuições)
3. Atualizar código de importação para prevenir novas duplicatas
4. (Opcional) Re-importar planilha atualizada para sincronizar inativos
