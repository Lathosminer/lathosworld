// Ambient type for the Workers runtime module. The real module is provided by
// workerd. Local Vite dev and the Vercel bundle do not load it.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
