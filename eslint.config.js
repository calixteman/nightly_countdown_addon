import globals from "globals";

export default [
  {
    files: ["background.js", "popup/popup.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // WebExtension API
        browser: "readonly",
        // Available in background scripts
        OffscreenCanvas: "readonly",
      },
    },
    rules: {
      // Possible errors
      "no-undef": "error",
      "no-unused-vars": "warn",

      // Best practices
      "eqeqeq": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-console": "warn",

      // Style
      "semi": ["error", "always"],
      "quotes": ["error", "double"],
    },
  },
];
