<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: bot-event-batch-processing
description: >
  Ensures createBotHandler bots process every event in an Array.isArray batch
  (never payload[0] or extractRStreamsPayload on the whole batch). Use when
  writing, reviewing, or fixing platform-backend bots, assessors, process-*
  libs, offload handlers, or any rstreams event consumer.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/bot-event-batch-processing/SKILL.md
---

# Bot event batch processing

## When this applies

Any `platform-backend/**/bots/**` handler, `lib/process-*.ts` helper, or
template bot that receives work from `createBotHandler` / rstreams reads.

## Non-negotiable contract

1. A read returns up to `batchSize` events.
2. The SDK may pass **one object** or an **array**.
3. **Loop the array.** Dropping `payload[0]` only is a production bug (PR
   #2118).
4. `extractRStreamsPayload` is **per item**. Multi-item arrays throw at runtime.
5. Isolate per-item errors with `{ __error: true, ... }` so the rest of the
   batch proceeds.
6. Cron-only bots that ignore queue bodies are listed **explicitly** in
   `tools/eslint-plugin-loxtep-bots/allowlist.js` — never blanket `*-assessor/`.

## Implementation checklist

Copy and track:

```
- [ ] Array.isArray(payload) branch present (bot index or process*Events lib)
- [ ] for (const item of payload) processes every element
- [ ] extractRStreamsPayload(item, meta) inside per-item helper — not on payload
- [ ] Batch returns results[]; single path returns one result
- [ ] Unit test with 2+ events asserts N side effects / N results
- [ ] No eslint-disable for loxtep-bots/require-batch-array-loop
```

## Canonical references

- Rule: `.cursor/rules/bot-event-batch-processing.mdc`
- Stream + batch: `.cursor/rules/rstreams-stream-write.mdc`
- Template: `platform-backend/_templates/_new_ms/bots/botExample/index.ts`
- Example fix:
  `platform-backend/connectors/lib/process-pko-connector-created.ts`
- Lint: `tools/eslint-plugin-loxtep-bots/rules/require-batch-array-loop.js`

## Review / audit pass

When asked to verify bots process batches correctly:

```bash
# Bot indexes + process libs
npx eslint 'platform-backend/*/bots/*/index.ts' 'platform-backend/*/lib/process-*.ts' --max-warnings=0

# Footguns (should be empty for handler-arg extract without Array.isArray)
rg -n 'extractRStreamsPayload\(\s*(payload|event)\s*,' platform-backend --glob '**/bots/**' --glob '!**/*.test.ts'
```

Flag any hit that lacks a nearby `Array.isArray` loop in the same module (or a
`process*Events` delegate that loops).
