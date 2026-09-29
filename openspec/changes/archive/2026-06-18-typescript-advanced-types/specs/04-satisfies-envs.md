# Spec: satisfies envType

## Given
`envs.ts` defines a Zod schema (`envSchema`), infers `envType` from it, parses `process.env`, and then manually reconstructs the typed object field by field:

```ts
export const envs: envType = {
  PORT: envParsed.data.PORT,
  ALLOWED_ORIGINS: envParsed.data.ALLOWED_ORIGINS,
  // ... 14 more fields
}
```

## When
The manual reconstruction is replaced with:

```ts
export const envs = envParsed.data satisfies envType
```

## Then
- `envs` has exactly the same type as before (`envType`)
- TypeScript validates at compile time that `envParsed.data` matches the schema
- The manual copy-paste of 15 fields is eliminated
- If a new env var is added to the schema, it's automatically available in `envs`
