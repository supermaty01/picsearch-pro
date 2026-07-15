## Summary

<!-- What does this PR do? One or two sentences. -->

## Requirements addressed

<!-- Reference IDs from docs/01-requirements.md, e.g. FR-3, NFR-4 -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass locally
- [ ] New external inputs are Zod-validated at the boundary (NFR-4)
- [ ] Docs updated in this PR if behavior changed (NFR-8)
- [ ] No secrets, keys, or model IDs hardcoded outside `packages/shared/src/models.ts`
