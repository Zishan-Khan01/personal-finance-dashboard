import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import {
  defineConfig,
  globalIgnores
} from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),

  {
    files: ["**/*.{js,jsx}"],

    extends: [
      js.configs.recommended
    ],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      globals: globals.browser,

      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },

    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },

    settings: {
      react: {
        version: "detect"
      }
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      "react/jsx-uses-vars": "error",

      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: ["useAuth"]
        }
      ]
    }
  }
]);