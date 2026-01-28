

## Plano: Atualizar Condutores com Dados de CNH

### Resumo dos Dados

A planilha contém **103 funcionários** que são condutores, com as seguintes informações:

| Coluna | Descrição |
|--------|-----------|
| CPF | Identificador único do funcionário |
| NOME | Nome completo |
| EMAIL | E-mail (pode ser usado para atualização) |
| CNH | Número da CNH |
| CATEGORIA | Categoria da CNH (A, B, AB, AC, AD, AE) |
| VENCIMENTO CNH | Data de vencimento (DD/MM/YYYY) |

### Ação Necessária

Para cada CPF da planilha, atualizar o funcionário correspondente no banco de dados:

1. **Marcar como condutor**: `is_condutor = true`
2. **Número da CNH**: `cnh_numero`
3. **Categoria da CNH**: `cnh_categoria`
4. **Validade da CNH**: `cnh_validade` (converter DD/MM/YYYY para YYYY-MM-DD)

### Tratamento de Dados Especiais

Alguns registros têm dados ausentes ou inválidos que serão tratados:
- CPFs como "039.439.998-66" (Antonio Carlos Pereira) - sem dados de CNH
- CPFs como "145.541.908-70" (Antonio Jose Limeira) - CNH = "-"
- Categorias vazias ou "-" serão ignoradas

### Execução

Serão executados **103 comandos UPDATE** no banco de dados, atualizando os funcionários pelo CPF (sem pontuação).

**Exemplo de atualização:**
```sql
UPDATE funcionarios SET 
  is_condutor = true,
  cnh_numero = '1209387626',
  cnh_categoria = 'AB',
  cnh_validade = '2035-02-11'
WHERE cpf = '21901369897' AND active = true;
```

### Resultado Esperado

- Todos os funcionários listados serão marcados como condutores
- Dados de CNH (número, categoria, validade) serão preenchidos
- Funcionários que já são condutores terão seus dados atualizados
- CPFs não encontrados serão ignorados (registro pode não existir ou CPF diferente)

