// Empty stand-in for the `server-only` guard package, which Next resolves at
// build time but is NOT a real installed dependency. tsx scripts run outside
// the Next runtime, so `import 'server-only'` in our server modules would fail
// with "Cannot find module 'server-only'". The `scripts/tsconfig.json` path
// mapping points the `server-only` specifier here. Intentionally empty.
export {};
