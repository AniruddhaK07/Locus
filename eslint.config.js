import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "fixtures/**",
      "coverage/**",
      "*.local"
    ],
  },
  // Engine boundary: No React, no UI imports
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message: "Engine must be framework-agnostic. Direct React imports are forbidden in src/engine/."
            },
            {
              name: "react-dom",
              message: "Engine must be framework-agnostic. React DOM imports are forbidden in src/engine/."
            },
            {
              name: "react-router-dom",
              message: "Engine must be framework-agnostic. React Router imports are forbidden in src/engine/."
            }
          ],
          patterns: [
            {
              group: ["**/ui/**", "@ui/**", "../ui/**", "../../ui/**"],
              message: "Engine layer must not import from the UI layer."
            }
          ]
        }
      ]
    }
  },
  // UI boundary: Can only import public engine API (from src/engine/index.ts or @engine)
  {
    files: ["src/ui/**/*.ts", "src/ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/engine/!(index)",
                "**/engine/*/**",
                "../engine/!(index)",
                "../../engine/!(index)",
                "../../../engine/!(index)",
                "@engine/*"
              ],
              message: "UI components must import only from the public engine API ('src/engine/index.ts' or '@engine'). Direct imports of internal engine modules are forbidden."
            }
          ]
        }
      ]
    }
  }
);
