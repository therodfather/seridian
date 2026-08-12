import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // wasm-unsafe-eval: ONNX Runtime compiles WASM (Chrome 109+ no longer allows this via unsafe-eval).
      // blob: workers: Transformers.js / onnxruntime-web spawn blob: Web Workers.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "worker-src 'self' blob:",
      // Convex sync uses wss://*.convex.cloud; HTTP actions / site URL use *.convex.site.
      // Browsers do not treat https: sources as covering wss: for WebSocket CSP checks.
      // Hugging Face Hub + LFS/Xet CDNs: in-browser Transformers.js model downloads.
      // CSP *.example.com matches one subdomain label only, so apex + *.hf.co + *.xethub.hf.co
      // are all required (cas-bridge.xethub.hf.co is two labels under hf.co).
      "connect-src 'self' blob: data: https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://huggingface.co https://*.huggingface.co https://hf.co https://*.hf.co https://*.xethub.hf.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
