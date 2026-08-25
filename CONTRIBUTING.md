# Contributing

## Workflow

1. Create a branch.
2. Keep changes focused by domain.
3. Add or update tests for behavior changes.
4. Run the build before opening a PR.

## Commands

```bash
npm run build
npm test
npx prisma generate
npx prisma migrate deploy
```

## Code Style

- TypeScript first
- domain-based modules
- explicit validation on input boundaries
- no ad-hoc database access inside controllers

## Review Expectations

Changes should preserve:

- API shape consistency
- RBAC correctness
- secure file handling
- predictable pagination and filtering
