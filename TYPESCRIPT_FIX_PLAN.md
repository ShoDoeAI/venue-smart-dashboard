# TypeScript Fix Plan

## Error Analysis (46 total errors)

### Error Categories:
1. **TS6133** (21 errors) - Unused variables (quick wins!)
2. **TS2339** (13 errors) - Property doesn't exist on type
3. **TS2322** (4 errors) - Type assignment issues
4. **TS2749** (3 errors) - Using value as type
5. **TS2345** (2 errors) - Argument type mismatch
6. **TS2307** (1 error) - Module not found
7. **TS2554** (1 error) - Wrong number of arguments
8. **TS6196** (1 error) - Declared but never used

## Smart Fix Strategy

### Phase 1: Critical Build Blockers (5 min)
1. Fix TS2307 - Missing module `toast-analytics`
2. Fix TS2554 - Wrong argument count in test-toast.ts
3. Fix TS2339 - Missing `fetchData` method

### Phase 2: Quick Wins - Unused Variables (10 min)
- Remove or prefix with `_` all 21 unused variables
- Use `// @ts-expect-error` for legitimate cases

### Phase 3: Type Fixes (15 min)
1. Fix union type property access (TS2339)
2. Fix type assignments (TS2322)
3. Fix value-as-type errors (TS2749)
4. Fix argument mismatches (TS2345)

### Phase 4: Re-enable Connectors (10 min)
1. Fix Meta connector BaseConnector issues
2. Fix OpenTable connector type problems
3. Fix Audience Republic connector
4. Update exports in index files

## Execution Order:
1. Start with critical blockers (can't build without these)
2. Quick wins for momentum (unused vars)
3. Complex type fixes
4. Re-enable connectors last

Total time estimate: 40 minutes