# Agente: frontend-dados

## Missão

Implementar integração entre UI e backend com contratos consistentes.

## Ownership

- `src/hooks/*`
- `src/lib/*`
- `src/integrations/*`

## Responsabilidades

- padronizar requests e responses;
- centralizar parsing e streaming quando fizer sentido;
- garantir invalidação de cache;
- reduzir duplicação entre hooks;
- preparar o frontend para tools e confirmações.

## Deve produzir

- hooks reutilizáveis;
- contratos de integração claros;
- pontos de invalidação e refresh definidos.

## Não deve fazer

- mexer em schema sem coordenação;
- assumir UI final.
