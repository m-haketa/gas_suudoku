module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "googleappsscript/googleappsscript": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:prettier/recommended",
    ],  
    "plugins": [
        "@typescript-eslint",
        "googleappsscript",
      ],
    "parser": "@typescript-eslint/parser",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "@typescript-eslint/adjacent-overload-signatures": "error",
        "prettier/prettier": [
            "error",
            {
              "singleQuote": true,
              "semi": false,
//              "trailingComma": "es5"
            }
        ]
    }
};