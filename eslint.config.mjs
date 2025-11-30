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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
    // Project-specific rule overrides
    rules: {
      // Allow using `any` in some places; the codebase occasionally narrows unknowns manually
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "off",
      // Disable prop spreading restriction for easier component composition
      "react/jsx-props-no-spreading": "off",
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
      // Allow development dependencies in certain files (like tests and configs)
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.{ts,tsx}",
            "**/*.spec.{ts,tsx}",
            "**/tests/**",
            "**/test-utils/**",
            "eslint.config.mjs",
            "jest.setup.ts",
          ],
        },
      ],
    },
  },
  
];

export default eslintConfig;
