(() => {
  "use strict";

  const keywords = new Set([
    "also", "as", "break", "build", "comptime", "const", "constptr",
    "constref", "defer", "else", "enum", "export", "extern", "for", "if",
    "inline", "jumpto", "lend", "loop", "match", "module", "override",
    "own", "private", "proceed", "range", "return", "structure", "unsafe",
    "volatile", "while", "yield"
  ]);

  const types = new Set([
    "bool", "char", "error", "f32", "f64", "i8", "i16", "i32", "i64",
    "isize", "string", "stringv", "u8", "u16", "u32", "u64", "usize",
    "void"
  ]);

  const literals = new Set(["false", "none", "null", "true"]);
  const builtins = new Set([
    "len", "new", "self", "stderr", "stderrln", "stdout", "stdoutln", "take"
  ]);
  const wordOperators = new Set(["and", "or", "raw"]);
  const operators = [
    "===", "!==", "<<=", ">>=", "...", "<-", "->", "=>", "::", ":=", "==",
    "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=",
    "&=", "|=", "^=", "<<", ">>", "+", "-", "*", "/", "%", "=", "!", "<",
    ">", "&", "|", "^", "~", "?", ":"
  ];

  const escapeHtml = (value) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const span = (className, value) =>
    `<span class="${className}">${escapeHtml(value)}</span>`;

  function highlight(source) {
    let output = "";
    let cursor = 0;

    while (cursor < source.length) {
      const rest = source.slice(cursor);

      if (rest.startsWith("//")) {
        const end = source.indexOf("\n", cursor);
        const stop = end === -1 ? source.length : end;
        output += span("fl-comment", source.slice(cursor, stop));
        cursor = stop;
        continue;
      }

      if (rest.startsWith("/*")) {
        const end = source.indexOf("*/", cursor + 2);
        const stop = end === -1 ? source.length : end + 2;
        output += span("fl-comment", source.slice(cursor, stop));
        cursor = stop;
        continue;
      }

      if (source[cursor] === '"' || source[cursor] === "'") {
        const quote = source[cursor];
        let end = cursor + 1;
        while (end < source.length) {
          if (source[end] === "\\") {
            end += 2;
            continue;
          }
          if (source[end++] === quote) break;
        }
        output += span("fl-string", source.slice(cursor, end));
        cursor = end;
        continue;
      }

      const importDirective = rest.match(/^@imports\b/);
      if (importDirective) {
        output += span("fl-keyword", importDirective[0]);
        cursor += importDirective[0].length;
        continue;
      }

      const label = rest.match(/^#[A-Za-z_][A-Za-z0-9_]*/);
      if (label) {
        output += span("fl-label", label[0]);
        cursor += label[0].length;
        continue;
      }

      const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (identifier) {
        const word = identifier[0];
        let className = "";
        if (literals.has(word)) className = "fl-literal";
        else if (keywords.has(word)) className = "fl-keyword";
        else if (types.has(word)) className = "fl-type";
        else if (builtins.has(word)) className = "fl-builtin";
        else if (wordOperators.has(word)) className = "fl-operator";
        else if (/^[A-Z]/.test(word)) className = "fl-type";
        else if (/^\s*\(/.test(rest.slice(word.length))) className = "fl-function";

        output += className ? span(className, word) : escapeHtml(word);
        cursor += word.length;
        continue;
      }

      const number = rest.match(/^(?:0[xX][0-9A-Fa-f](?:_?[0-9A-Fa-f])*|0[bB][01](?:_?[01])*|\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?)/);
      if (number) {
        output += span("fl-number", number[0]);
        cursor += number[0].length;
        continue;
      }

      const operator = operators.find((candidate) => rest.startsWith(candidate));
      if (operator) {
        output += span("fl-operator", operator);
        cursor += operator.length;
        continue;
      }

      output += escapeHtml(source[cursor]);
      cursor += 1;
    }

    return output;
  }

  function highlightFlechaBlocks() {
    document.querySelectorAll("pre code.language-flecha, pre code.lang-flecha")
      .forEach((block) => {
        if (block.dataset.flechaHighlighted === "true") return;
        block.innerHTML = highlight(block.textContent);
        block.dataset.flechaHighlighted = "true";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightFlechaBlocks);
  } else {
    highlightFlechaBlocks();
  }
})();
