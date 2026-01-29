

# Plano: Corrigir Erro de Chave Duplicada no Patrimônio

## Problema Identificado

O erro `duplicate key value violates unique constraint "assets_patrimonio_key"` ocorre devido a uma **condição de corrida** (race condition):

1. A função `generatePatrimonio(tipoId)` é chamada no frontend
2. O banco calcula o próximo número sequencial (ex: `NTB-2600025`)
3. O frontend tenta inserir o ativo com esse patrimônio
4. **Se houver falha ou delay**, outro processo pode gerar o mesmo número
5. Ao tentar inserir, o patrimônio já existe → ERRO

### Cenários que causam o problema:
- Duplo clique no botão "Criar Ativo"
- Erro de conexão seguido de retry
- Dois usuários criando ativos simultaneamente

---

## Solução

Implementar **geração atômica com retry** - o patrimônio será gerado diretamente no banco usando um trigger ou uma função que faz INSERT com retry automático em caso de colisão.

### Abordagem escolhida:
Criar uma nova função RPC `create_asset_with_patrimonio` que:
1. Gera o patrimônio
2. Insere o ativo
3. Em caso de colisão, tenta novamente com novo sequencial (até 5 tentativas)
4. Retorna o ativo criado ou erro

---

## Mudanças Necessárias

### 1. Migração SQL - Nova Função Atômica

```sql
CREATE OR REPLACE FUNCTION public.create_asset_with_patrimonio(
  p_tipo_id UUID,
  p_nome TEXT,
  p_marca TEXT DEFAULT NULL,
  p_modelo TEXT DEFAULT NULL,
  p_numero_serie TEXT DEFAULT NULL,
  p_imei TEXT DEFAULT NULL,
  p_chip_linha TEXT DEFAULT NULL,
  p_descricao TEXT DEFAULT NULL,
  p_data_aquisicao DATE DEFAULT NULL,
  p_valor_aquisicao NUMERIC DEFAULT NULL,
  p_funcionario_id UUID DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'disponivel'
)
RETURNS TABLE(id UUID, patrimonio TEXT) AS $$
DECLARE
  v_patrimonio TEXT;
  v_asset_id UUID;
  v_attempt INTEGER := 0;
  v_max_attempts INTEGER := 5;
BEGIN
  WHILE v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;
    
    -- Gerar patrimônio
    v_patrimonio := public.generate_patrimonio(p_tipo_id);
    
    BEGIN
      -- Tentar inserir
      INSERT INTO assets (
        patrimonio, nome, tipo_id, marca, modelo, numero_serie,
        imei, chip_linha, descricao, data_aquisicao, valor_aquisicao,
        funcionario_id, empresa_id, status
      ) VALUES (
        v_patrimonio, p_nome, p_tipo_id, p_marca, p_modelo, p_numero_serie,
        p_imei, p_chip_linha, p_descricao, p_data_aquisicao, p_valor_aquisicao,
        p_funcionario_id, p_empresa_id, p_status
      )
      RETURNING assets.id INTO v_asset_id;
      
      -- Sucesso - retornar
      RETURN QUERY SELECT v_asset_id, v_patrimonio;
      RETURN;
      
    EXCEPTION WHEN unique_violation THEN
      -- Colisão detectada - tentar novamente
      CONTINUE;
    END;
  END LOOP;
  
  -- Excedeu tentativas
  RAISE EXCEPTION 'Não foi possível gerar patrimônio único após % tentativas', v_max_attempts;
END;
$$ LANGUAGE plpgsql;
```

### 2. Atualizar DynamicAssetForm.tsx

Substituir a chamada separada de `generatePatrimonio` + `createAtivo` por uma única chamada RPC:

```typescript
// ANTES (duas operações separadas - problemático)
const patrimonio = await generatePatrimonio(tipoId);
await createAtivo.mutateAsync({ patrimonio, ...assetData });

// DEPOIS (operação atômica)
const { data, error } = await supabase.rpc('create_asset_with_patrimonio', {
  p_tipo_id: tipoId,
  p_nome: nome,
  p_marca: formData.marca || null,
  // ... demais campos
});
```

### 3. Adicionar proteção de duplo clique

Desabilitar o botão durante o submit já está implementado (`disabled={isSubmitting}`), mas vamos garantir que o form não seja submetido se já estiver em progresso.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Criar função `create_asset_with_patrimonio` |
| `src/components/DynamicAssetForm.tsx` | Usar nova função RPC atômica |
| `src/components/NotebookForm.tsx` | Usar nova função RPC atômica |
| `src/hooks/useAtivos.ts` | Adicionar nova função de criação atômica |

---

## Resultado Esperado

1. Cadastro de ativos funciona sem erro de chave duplicada
2. Duplo clique não causa problemas
3. Operações concorrentes são tratadas automaticamente
4. Patrimônio sempre único e sequencial

