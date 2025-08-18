import globals from "globals";
import pluginJs from "@eslint/js";
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: globals.mocha },
  },
  pluginJs.configs.recommended,
  prettier,
];