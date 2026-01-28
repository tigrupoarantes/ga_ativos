

## Plano: Importação em Massa de Veículos

### Resumo dos Dados

| Item | Valor |
|------|-------|
| Total de veículos | **137 registros** |
| Campos por veículo | 22 colunas |
| Dados inclusos | Dados básicos, Licenciamento, IPVA, Seguro, Condutor |

---

### 1. Criar Componente de Importação

Criar `ImportVeiculosDialog.tsx` seguindo o padrão de `ImportLinhasDialog.tsx` e `ImportFuncionariosDialog.tsx`:

**Funcionalidades:**
- Upload de arquivo CSV/XLSX
- Preview dos dados antes de importar
- Validação de campos obrigatórios (Placa, Marca, Modelo)
- Mapeamento automático de Empresa pelo nome
- Mapeamento de Funcionário/Condutor pelo CPF
- Indicadores de status (válido, aviso, erro)

---

### 2. Mapeamento de Dados

#### 2.1 Tipos de Veículo
```text
Planilha → Banco
Carro → carro
Caminhão → caminhao
Caminhonete → caminhonete
Furgão → furgao
Moto → moto
Picape → pickup
Van → van
```

#### 2.2 Propriedade
```text
"Particular" → propriedade: "particular", empresa_id: null
Qualquer outro valor → propriedade: "empresa", empresa_id: buscar pela coluna EMPRESA
```

#### 2.3 Situação Licenciamento/IPVA
```text
"Pago" → "pago"
"Não pago" → "nao_pago"
"Isento" → "isento"
"À vencer" → "a_vencer"
```

#### 2.4 Valores Monetários
- Remover "R$", espaços, e pontos de milhar
- Converter vírgula para ponto decimal
- Exemplo: "R$ 2.514,29" → 2514.29

#### 2.5 Datas
- Detectar formato (M/D/YY, DD/MM/YYYY, etc.)
- Converter para ISO (YYYY-MM-DD)
- Exemplo: "1/13/25" → "2025-01-13"

---

### 3. Mapeamento de Empresas

Empresas encontradas na planilha:

| Nome na Planilha | Empresa no Sistema | ID |
|-----------------|-------------------|-----|
| J. Arantes | J. ARANTES TRANSPORTES | c7877bba-... |
| Chok Distribuidora | CHOK DISTRIBUIDORA | fd1400f7-... |
| Chokdoce | CHOKDOCE CD | f3faa894-... |
| Chokagro | (criar ou mapear) | - |
| G4 Distribuidora | DISTRIBUIDORA G4 ARANTES | 100689e3-... |
| Grupo Arantes | J. ARANTES TRANSPORTES | c7877bba-... |
| DAY2DAY | (criar ou mapear) | - |
| Localiza | (criar - locadora) | - |
| Particular | - | null |

---

### 4. Interface de Preview

```text
+----------------------------------------------------------+
| Importar Veículos                                     [X] |
+----------------------------------------------------------+
| [Baixar Modelo CSV]  [Exportar Atuais]                    |
+----------------------------------------------------------+
| Arquivo: [veiculos_atualizado.xlsx  ▼]                    |
+----------------------------------------------------------+
| Resumo:                                                   |
| ✓ 130 válidos | ⚠ 5 avisos | ✗ 2 erros                   |
+----------------------------------------------------------+
| PLACA   | MARCA | MODELO | EMPRESA    | STATUS            |
|---------|-------|--------|------------|-------------------|
| AYH7F87 | VW    | Gol    | J. Arantes | ✓ OK              |
| BMK1A41 | BMW   | X1     | Particular | ✓ OK              |
| XYZ1234 | -     | -      | -          | ✗ Marca obrigatória|
+----------------------------------------------------------+
| [Cancelar]                   [Importar 135 veículos]      |
+----------------------------------------------------------+
```

---

### 5. Fluxo de Importação

```text
1. Upload do arquivo
      ↓
2. Parse CSV/Excel
      ↓
3. Normalizar dados
   - Limpar valores monetários
   - Converter datas
   - Normalizar tipos
      ↓
4. Buscar referências
   - Empresas por nome
   - Funcionários por CPF
      ↓
5. Validar registros
   - Campos obrigatórios
   - Duplicidade de placa
      ↓
6. Mostrar preview
      ↓
7. Confirmar importação
      ↓
8. Inserir no banco (batch)
```

---

### 6. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/ImportVeiculosDialog.tsx` | **Criar** - Componente de importação |
| `src/pages/Veiculos.tsx` | **Modificar** - Adicionar botão de importação |

---

### 7. Tratamento Especial

**Ano Modelo** (formato "2014 / 2015"):
- Extrair o segundo valor (2015) como ano_modelo
- Primeiro valor já está na coluna ANO FABRICACAO

**Campo CÓDIGO FIPE**:
- Precisa adicionar coluna `codigo_fipe` à tabela (ainda não existe)

**Condutor por CPF**:
- Buscar funcionário pelo CPF limpo (apenas números)
- Se não encontrar, deixar sem condutor (aviso)

---

### 8. Resultado Esperado

Após a importação:
- 137 veículos cadastrados com todos os dados
- Licenciamento preenchido (valor, vencimento, situação)
- IPVA preenchido (valor, vencimento, situação)
- Seguro preenchido (apólice, valor, vencimento)
- Condutores vinculados pelo CPF

