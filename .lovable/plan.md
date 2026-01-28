

## Plano: Simplificar Consulta FIPE - Consulta Direta por Código

### Problema Atual

Quando o usuário clica no botão de consulta FIPE ($):
- Abre um dialog com abas e formulários complexos
- Não utiliza o código FIPE já cadastrado no veículo
- O usuário precisa selecionar marca/modelo/ano manualmente

**O que deveria acontecer:**
- Ler o código FIPE já cadastrado no veículo
- Consultar automaticamente o valor na API FIPE
- Mostrar o resultado diretamente (ou erro se não encontrar)

---

### Descoberta da API

A API Parallelum **suporta sim** busca por código FIPE:

```text
GET /{vehicleType}/{fipeCode}/years
  → Retorna os anos disponíveis para o código FIPE

GET /{vehicleType}/{fipeCode}/years/{yearId}
  → Retorna o valor FIPE para o ano específico
```

Exemplo:
- Código FIPE: `5228-0`
- Ano do veículo: `2015`
- Combustível: Gasolina (código 1)
- URL: `GET /cars/5228-0/years/2015-1`

---

### Solução

#### 1. Modificar Edge Function `consulta-fipe`

Adicionar nova action `valor-por-codigo-ano`:
- Recebe: `codigoFipe`, `tipo`, `ano`
- Primeiro consulta anos disponíveis: `/{tipo}/{codigoFipe}/years`
- Encontra o yearId que corresponde ao ano do veículo
- Consulta o valor: `/{tipo}/{codigoFipe}/years/{yearId}`
- Retorna o resultado formatado

#### 2. Modificar `useFipeConsulta.ts`

Adicionar mutation `useFipeConsultaDireta`:
```typescript
useFipeConsultaDireta({
  veiculoId: string,
  codigoFipe: string,
  tipo: string,
  ano: number
})
```

#### 3. Modificar Comportamento do Botão FIPE

Em `Veiculos.tsx`, ao clicar no botão de consulta FIPE:

**SE o veículo tem código FIPE cadastrado:**
- Mostrar loading no botão
- Consultar diretamente a API
- Exibir toast com resultado (sucesso ou erro)
- Não abrir dialog

**SE o veículo NÃO tem código FIPE:**
- Abrir o dialog atual para seleção manual de marca/modelo/ano

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/consulta-fipe/index.ts` | Adicionar action `valor-por-codigo-ano` |
| `src/hooks/useFipeConsulta.ts` | Adicionar `useFipeConsultaDireta` |
| `src/pages/Veiculos.tsx` | Modificar lógica do botão FIPE |

---

### Fluxo da Consulta Direta

```text
Usuário clica no botão $ (FIPE)
           ↓
    Veículo tem código FIPE?
       ↓         ↓
      SIM       NÃO
       ↓         ↓
  Consulta      Abre dialog
  direta        manual
       ↓
  Loading no botão
       ↓
  Edge function busca anos
  do código FIPE
       ↓
  Encontra ano correspondente
  ao ano_modelo do veículo
       ↓
  Consulta valor FIPE
       ↓
  Atualiza banco de dados
       ↓
  Toast: "R$ XX.XXX,XX"
```

---

### Detalhes Técnicos da Edge Function

```typescript
case "valor-por-codigo-ano":
  // 1. Buscar anos disponíveis para o código FIPE
  const anosUrl = `${FIPE_API_BASE}/${tipoApi}/${codigoFipe}/years`;
  const anosResponse = await fetch(anosUrl);
  const anos = await anosResponse.json();
  
  // 2. Encontrar yearId que corresponde ao ano
  // Anos vêm como: [{ code: "2015-1", name: "2015 Gasolina" }, ...]
  const anoEncontrado = anos.find(a => a.code.startsWith(`${ano}-`));
  
  if (!anoEncontrado) {
    // Tentar primeiro ano disponível
    anoEncontrado = anos[0];
  }
  
  // 3. Consultar valor
  const valorUrl = `${FIPE_API_BASE}/${tipoApi}/${codigoFipe}/years/${anoEncontrado.code}`;
  const valorResponse = await fetch(valorUrl);
  // ... processar e retornar
```

---

### Tratamento de Erros

| Cenário | Comportamento |
|---------|---------------|
| Código FIPE inválido | Toast: "Código FIPE inválido ou não encontrado" |
| Ano não disponível | Usar primeiro ano disponível e informar |
| Erro de rede | Toast: "Erro ao consultar FIPE" |
| Sem código FIPE | Abre dialog manual |

---

### Resultado Esperado

Após implementação:
- **Um clique** no botão $ já consulta e atualiza o valor FIPE
- Sem dialogs desnecessários para veículos com código FIPE
- Fallback para dialog manual quando não há código
- Experiência mais rápida e direta

