import { Prism } from 'prism-react-renderer'

/**
 * `prism-react-renderer` only bundles a subset of Prism grammars. Java and
 * `.properties` are used heavily in the lessons, so register compact grammars
 * for them instead of silently highlighting those blocks as bash.
 */

Prism.languages.java = {
  comment: [
    { pattern: /\/\*[\s\S]*?\*\//, greedy: true },
    { pattern: /\/\/[^\r\n]*/, greedy: true },
  ],
  string: {
    pattern: /"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*'/,
    greedy: true,
  },
  annotation: {
    pattern: /@[A-Za-z_]\w*/,
    alias: 'builtin',
  },
  keyword:
    /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|non-sealed|package|permits|private|protected|public|record|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield)\b/,
  boolean: /\b(?:true|false|null)\b/,
  number:
    /\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[fFdDlL]?)\b/,
  classname: /\b[A-Z][A-Za-z0-9_$]*\b/,
  function: /\b[a-z_$][\w$]*(?=\s*\()/,
  operator: /[+\-*/%=<>!&|^~?:]+/,
  punctuation: /[{}[\];(),.]/,
}

Prism.languages.properties = {
  comment: /^[ \t]*[#!][^\r\n]*/m,
  'key-value': {
    pattern: /^[ \t]*[^=:#\s][^=:#\r\n]*(?:[ \t]*[=:][ \t]*[^\r\n]*)?$/m,
    inside: {
      key: {
        pattern: /^[ \t]*[^=:#\s][^=:#\r\n]*/,
        alias: 'attr-name',
      },
      value: {
        pattern: /[=:][ \t]*[^\r\n]*$/,
        alias: 'string',
      },
    },
  },
}
