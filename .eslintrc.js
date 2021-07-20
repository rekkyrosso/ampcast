module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "@typescript-eslint",
		"react-hooks"
    ],
    "rules": {
        'curly': 'error',
        'guard-for-in': 'error',
        'no-unused-labels': 'error',
        'no-duplicate-case': 'error',
        'no-bitwise': 'error',
        'no-debugger': 'error',
        'no-console': ['error', {allow: ['info', 'log', 'warn', 'error']}],
        'no-new-wrappers': 'error',
        'no-redeclare': 'error',
        'no-empty': 'error',
        'no-eval': 'error',
        'no-throw-literal': 'error',
        'no-fallthrough': 'error',
        'no-template-curly-in-string': 'error',
        'radix': 'error',
        'eqeqeq': ['error', 'smart'],
        'no-caller': 'error',
        'no-alert': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',

        'no-redeclare': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
    },
    "settings": {
        "react": {
            "version": "detect"
        }
    }
};
