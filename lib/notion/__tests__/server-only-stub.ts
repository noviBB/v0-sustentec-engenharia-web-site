// Test-only stub for the `server-only` package, which throws when imported
// outside a React Server Component. Aliased in vitest.config.ts so the pure
// parser/property-map modules (which transitively import it via types.ts) can
// run under Node in tests. Intentionally empty.
export {};
