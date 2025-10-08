import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import json from '@eslint/json';
import {defineConfig, globalIgnores} from 'eslint/config';

export default defineConfig([
    {files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], plugins: {js}, extends: ['js/recommended']},
    {files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], languageOptions: {globals: globals.browser}},
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {files: ['**/*.json'], plugins: {json}, language: 'json/json', extends: ['json/recommended']},
    {files: ['**/*.jsonc'], plugins: {json}, language: 'json/jsonc', extends: ['json/recommended']},
    reactHooks.configs['recommended'],
    globalIgnores(['*', '!src', '!src/*']),
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'react/prop-types': 'off',
        },
    },
]);
