import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import importX from "eslint-plugin-import-x";

// Deliberately narrow: this config does NOT extend eslint:recommended or
// typescript-eslint:recommended. `tsc` already runs with `strict`,
// `noUnusedLocals`, `noUnusedParameters` and `noFallthroughCasesInSwitch`, and
// is gated in CI, so those rule sets would be almost entirely redundant noise.
// Only rules covering what the compiler structurally cannot see are enabled.
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/demo-dist/**", "**/coverage/**"],
  },

  // 1. Lit templates. Contents of html`` are opaque string literals to tsc:
  //    a misspelled binding or a malformed tag fails silently at runtime.
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [lit.configs["flat/recommended"]],
  },

  // 2. Promise misuse. Needs type information, so it is scoped to the files
  //    covered by each package's tsconfig (`src/**/*.ts`).
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [tseslint.configs.base],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },

  // 3. Dependency declarations. Importing a devDependency, or a package absent
  //    from the manifest, type-checks fine locally but breaks consumers after
  //    publish. `validate:pack` checks the file list, not the import graph.
  {
    files: ["packages/*/src/**/*.ts"],
    extends: [importX.flatConfigs.recommended, importX.flatConfigs.typescript],
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "packages/*/tsconfig.json",
          noWarnOnMultipleProjects: true,
        },
      },
    },
    rules: {
      // recommended brings rules that overlap with tsc; keep only the manifest check.
      ...Object.fromEntries(
        Object.keys(importX.flatConfigs.recommended.rules ?? {}).map((rule) => [
          rule,
          "off",
        ]),
      ),
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: false,
          peerDependencies: true,
          optionalDependencies: false,
        },
      ],
    },
  },
);
