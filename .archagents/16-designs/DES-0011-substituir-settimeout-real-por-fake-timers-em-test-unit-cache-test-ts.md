---
id: DES-0011
slug: substituir-settimeout-real-por-fake-timers-em-test-unit-cache-test-ts
title: "Substituir setTimeout real por fake timers em test/unit/cache.test.ts"
created_at: 2026-11-19T13:46:51Z
status: approved
ticket: TCK-0011
type: design
scope_files_new: []
scope_files_modified:
  - test/unit/cache.test.ts
scope_files_deleted: []
blast_radius: low
playbook: .archagents/16-designs/playbooks/DES-0011-playbook.md
acceptance_delta: unchanged
---
# DES-0011 - Substituir setTimeout real por fake timers em test/unit/cache.test.ts

## Problema

Os 10 testes de TTL em `test/unit/cache.test.ts` dependem de `setTimeout` real com TTL de 100 ms e margens de 20–30 ms (`L80-L94`, `L265-L277`). Sob contenção de CPU em CI (ex.: 4 containers Vitest em paralelo na run `44517012490`, job `135535524524`), o atraso do agendador faz `Date.now()` ultrapassar o TTL antes da asserção, gerando falhas intermitentes.

## Solução

- Ativar `vi.useFakeTimers()` e `vi.setSystemTime(...)` no `beforeEach` e restaurar `vi.useRealTimers()` no `afterEach` dos blocos `MemoryCache` e `KVCache` em `test/unit/cache.test.ts`.
- Substituir todas as esperas `await new Promise(resolve => setTimeout(resolve, ms))` por `vi.advanceTimersByTime(ms)`, mantendo as mesmas asserções de expiração e preservação de TTL sem tocar `lib/core/cache.ts`.

## Mudanças

- `test/unit/cache.test.ts`: usar fake timers do Vitest em todos os testes de TTL de `MemoryCache` e `KVCache`.

## Critérios de sucesso

- [ ] Nenhum `setTimeout` restante em `test/unit/cache.test.ts` e `useFakeTimers` ativo.
- [ ] `npx vitest run test/unit/cache.test.ts` e `npm test` passam deterministicamente e sem espera real.
