// Ambient type for the Workers runtime module. The real module is provided by
// workerd. Local Vite dev and the Vercel bundle do not have a bucket binding.
declare module "cloudflare:workers" {
  export const env: {
    MUSIC?: import("./lib/music").MusicBucket;
  };
}
