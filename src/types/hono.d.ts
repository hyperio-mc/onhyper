import 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    validatedBody: unknown;
    validatedQuery: unknown;
  }
}