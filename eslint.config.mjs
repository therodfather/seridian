import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Codemod defaults + vendor exclusion (committed vendored UI kit build
    // artifacts in vendor/ui-kit/dist must never be linted).
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "vendor/**",
    ],
  },
];

export default eslintConfig;
