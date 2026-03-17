### TypeScript Safety Rules

- Strictly avoid using `as any` or `: any` in TypeScript. Always prefer proper type casting (e.g., `(r as { specific: type }).field`), type narrowing, or using types inferred from schemas (e.g., `z.infer<typeof schema>`).
- Always use `!variable` validation before accessing ID or properties on destructured variables from Drizzle query returns since they can potentially be undefined arrays (`const [val] = await query` → `val` is possibly `undefined`).
- Never leave unused imported variables or defined variables. Take special care when declaring variable assignments with Drizzle `.returning()` method on queries (e.g., if you write `const result = await db.insert...`, make sure `result` is actually used, or just `await db.insert...` instead).

### Cloudflare Workers Rules

- **NEVER** use `process.env` — always use `c.env` in handlers or pass env explicitly.
- **NEVER** use `new Hono()` or `new OpenAPIHono()` directly — always use `createRouter()` from `src/factory.ts`.
- **ALWAYS** document routes with `createRoute()` from `@hono/zod-openapi` — never use bare `router.get()` for production routes.
- Use `z.string().datetime()` for timestamp fields in OpenAPI schemas, **never** `z.date()`.

### Project Rules

- Check for the presence of AGENTS.md and SSoT.md in the project workspace — they are the authoritative guides for project background, architecture, Golden Rules, and code patterns.