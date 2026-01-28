

## Plano: Limpeza de Funcionários sem CPF e Mapeamento de Empresas

### Ações a Executar

#### 1. Desativar Funcionários sem CPF

Executar query SQL para desativar os **175 funcionários** que não possuem CPF cadastrado e liberar seus ativos associados.

```sql
-- Liberar ativos dos funcionários sem CPF
UPDATE assets SET funcionario_id = NULL, status = 'disponivel' 
WHERE funcionario_id IN (
  SELECT id FROM funcionarios WHERE (cpf IS NULL OR cpf = '') AND active = true
);

-- Liberar veículos dos funcionários sem CPF
UPDATE veiculos SET funcionario_id = NULL, status = 'disponivel'
WHERE funcionario_id IN (
  SELECT id FROM funcionarios WHERE (cpf IS NULL OR cpf = '') AND active = true
);

-- Liberar linhas telefônicas
UPDATE linhas_telefonicas SET funcionario_id = NULL
WHERE funcionario_id IN (
  SELECT id FROM funcionarios WHERE (cpf IS NULL OR cpf = '') AND active = true
);

-- Desativar funcionários sem CPF
UPDATE funcionarios SET active = false 
WHERE (cpf IS NULL OR cpf = '') AND active = true;
```

---

#### 2. Adicionar Mapeamento de Empresas

Modificar a lógica de importação para reconhecer os nomes das empresas na planilha e mapear para as empresas corretas no sistema.

| Nome na Planilha | Empresa no Sistema |
|------------------|-------------------|
| `CDF COM DE PRODUTOS ALIMENTICIOS LTDA` | CHOKDOCE LOJA 2 |
| `JJGF COM DE PRODUTOS ALIMENTICIOS LTDA` | CHOKDOCE LOJA 3 |

---

### Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/ImportFuncionariosDialog.tsx` | Adicionar dicionário de aliases de empresas |

---

### Código a Adicionar

```typescript
// Mapeamento de nomes alternativos de empresas para nomes cadastrados
const empresaAliases: Record<string, string> = {
  'cdf com de produtos alimenticios ltda': 'chokdoce loja 2',
  'jjgf com de produtos alimenticios ltda': 'chokdoce loja 3',
};

// Na função processImport, antes de buscar empresa_id:
const empresaNormalizada = row.empresa.toLowerCase();
const empresaNomeFinal = empresaAliases[empresaNormalizada] || empresaNormalizada;
const empresaId = empresasMap.get(empresaNomeFinal);
```

---

### Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Funcionários ativos | 1.255 | ~1.080 |
| Funcionários sem CPF | 175 | 0 (inativos) |
| Empresas reconhecidas | Erro em 2 | 100% |

---

### Próximo Passo Após Implementação

Com o mapeamento funcionando, você poderá executar a importação da planilha que irá:
- Sincronizar cargos e empresas
- Desativar funcionários que não constam mais na lista ativa (~400)
- Criar novos funcionários se houver

