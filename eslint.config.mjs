import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\/(?:\\(marketing\\)|\\(dashboard\\))/]",
          message:
            "Do not put Next.js route groups in URLs. Use constants from @/lib/routes (e.g. /packages, /dashboard).",
        },
        {
          selector:
            "TemplateLiteral[quasis.0.value.raw=/\\/(?:\\(marketing\\)|\\(dashboard\\))/]",
          message:
            "Do not put Next.js route groups in URLs. Use constants from @/lib/routes (e.g. /packages, /dashboard).",
        },
      ],
    },
  },
];

export default eslintConfig;
