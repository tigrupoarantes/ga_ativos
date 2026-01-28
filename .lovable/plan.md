

## Plano: Reestruturar Cadastro de Veículos com Novas Abas e Campos

### Visao Geral

O cadastro de veiculos sera reformulado para incluir novos campos na aba principal e duas novas abas: **Licenciamento e IPVA** e **Seguros**.

---

### 1. Alteracoes no Banco de Dados

#### 1.1 Novos campos na tabela `veiculos`

```sql
-- Campo Propriedade (Empresa ou Particular)
ALTER TABLE veiculos ADD COLUMN propriedade text DEFAULT 'empresa';
-- 'empresa' = Empresa (usa empresa_id existente)
-- 'particular' = Particular

-- Campos de Licenciamento
ALTER TABLE veiculos ADD COLUMN licenciamento_valor numeric;
ALTER TABLE veiculos ADD COLUMN licenciamento_vencimento date;
ALTER TABLE veiculos ADD COLUMN licenciamento_situacao text DEFAULT 'nao_pago';
-- Valores: 'pago', 'nao_pago'

-- Campos de IPVA
ALTER TABLE veiculos ADD COLUMN ipva_valor numeric;
ALTER TABLE veiculos ADD COLUMN ipva_vencimento date;
ALTER TABLE veiculos ADD COLUMN ipva_situacao text DEFAULT 'nao_pago';
-- Valores: 'pago', 'nao_pago', 'isento'

-- Campos de Restricao
ALTER TABLE veiculos ADD COLUMN restricao boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN restricao_descricao text;

-- Campos de Seguro
ALTER TABLE veiculos ADD COLUMN possui_seguro boolean DEFAULT false;
ALTER TABLE veiculos ADD COLUMN seguro_vencimento date;
ALTER TABLE veiculos ADD COLUMN seguro_valor numeric;
ALTER TABLE veiculos ADD COLUMN seguro_apolice text;
```

---

### 2. Alteracoes na Interface (src/pages/Veiculos.tsx)

#### 2.1 Aba "Dados do Veiculo" - Reorganizacao

Os campos serao reorganizados na seguinte ordem:

| Campo | Tipo | Observacao |
|-------|------|------------|
| Placa* | Texto | Obrigatorio |
| Renavam | Texto (11 digitos) | Ja existe |
| Chassi | Texto (17 caracteres) | Ja existe |
| Tipo | Select | Novos valores: CARRO, CAMINHAO, CAMINHONETE, FURGAO, MOTO, PICKUP, VAN |
| Marca* | Texto | Obrigatorio, atualiza com FIPE |
| Modelo* | Texto | Obrigatorio, atualiza com FIPE |
| Ano Modelo | Numero | Ja existe |
| Ano Fabricacao | Numero | Ja existe |
| Codigo FIPE | Texto | Ja existe |
| Propriedade | Select | EMPRESA (selecionar empresa) / PARTICULAR |
| Empresa | Select | Visivel apenas se Propriedade = EMPRESA |
| Cor | Texto | Ja existe |
| Combustivel | Select | Ja existe |
| Status | Select | Ja existe |
| Responsavel | Combobox | Ja existe |
| Data Aquisicao | Date | Ja existe |
| Valor Aquisicao | Numero | Ja existe |

#### 2.2 Nova Aba "Licenciamento e IPVA"

| Campo | Tipo | Regras |
|-------|------|--------|
| **Licenciamento** | | |
| Valor Licenciamento | Numero (R$) | |
| Vencimento Licenciamento | Date | |
| Situacao Licenciamento | Select | Pago / Nao Pago |
| **IPVA** | | |
| Valor IPVA | Numero (R$) | |
| Vencimento IPVA | Date | |
| Situacao IPVA | Select | Pago / Nao Pago / Isento |
| *Nota* | Info | Se ano_fabricacao <= (ano_atual - 20), mostrar aviso de isencao |
| **Restricao** | | |
| Possui Restricao | Switch | Sim / Nao |
| Qual Restricao | Textarea | Visivel apenas se Possui Restricao = Sim |

#### 2.3 Nova Aba "Seguros"

| Campo | Tipo | Regras |
|-------|------|--------|
| Possui Seguro | Switch | Sim / Nao |
| Vencimento do Seguro | Date | Visivel se Possui Seguro = Sim |
| Valor do Seguro | Numero (R$) | Visivel se Possui Seguro = Sim |
| Numero da Apolice | Texto | Visivel se Possui Seguro = Sim |
| **Documentos** | | |
| Anexar Apolice e Documentos | Upload | Lista documentos do tipo "Seguro" e "Apolice" |

---

### 3. Arquitetura de Componentes

```text
+-------------------------------------------+
|        Dialog de Cadastro/Edicao          |
+-------------------------------------------+
|  Tabs                                     |
|  +---------------------------------------+|
|  | Dados do Veiculo | Licenc./IPVA |     ||
|  | Seguros | Documentos (ja existe)      ||
|  +---------------------------------------+|
|                                           |
|  [Conteudo da Aba Selecionada]            |
|                                           |
+-------------------------------------------+
```

---

### 4. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Veiculos.tsx` | Adicionar novos campos no formData, criar abas Licenciamento/IPVA e Seguros |
| `src/hooks/useVeiculos.ts` | Mapear novos campos no saveVeiculo |
| `src/types/index.ts` | Atualizar interface Veiculo |

---

### 5. Logica de Negocios

#### 5.1 Isencao Automatica de IPVA

```typescript
// Se ano_fabricacao <= ano_atual - 20
const anoAtual = new Date().getFullYear();
const isento = formData.ano_fabricacao && 
  parseInt(formData.ano_fabricacao) <= (anoAtual - 20);

if (isento) {
  // Mostrar badge "Veiculo com +20 anos - IPVA Isento"
  // Sugerir automaticamente ipva_situacao = 'isento'
}
```

#### 5.2 Propriedade do Veiculo

```typescript
// Se propriedade = 'particular', empresa_id deve ser null
// Se propriedade = 'empresa', mostrar campo Empresa
```

---

### 6. Novos Tipos de Veiculo

Substituir os tipos atuais por:

| Valor | Label |
|-------|-------|
| carro | Carro |
| caminhao | Caminhao |
| caminhonete | Caminhonete |
| furgao | Furgao |
| moto | Moto |
| pickup | Pickup |
| van | Van |

---

### 7. Estimativa de Implementacao

| Etapa | Descricao |
|-------|-----------|
| 1 | Criar migracao SQL para novos campos |
| 2 | Atualizar formData e tipos |
| 3 | Reorganizar aba "Dados do Veiculo" |
| 4 | Criar aba "Licenciamento e IPVA" |
| 5 | Criar aba "Seguros" com integracao de documentos |
| 6 | Ajustar logica de salvamento |
| 7 | Testar fluxo completo |

