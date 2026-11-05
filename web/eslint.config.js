const globals = require("globals");

module.exports = [
  {
    ignores: ["assets/**", "node_modules/**", "partials/**"],
  },
  {
    files: ["js/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", vars: "local" }],
      eqeqeq: ["warn", "smart"],
    },
  },
];
