const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function renderPortfolio() {
  const previous = require.extensions['.tsx'];
  const previousCss = require.extensions['.css'];
  require.extensions['.tsx'] = (module, filename) => {
    module._compile(compile(fs.readFileSync(filename, 'utf8')), filename);
  };
  require.extensions['.css'] = () => {};
  try {
    const App = require('../src/App.tsx').default;
    return fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8') + renderToStaticMarkup(React.createElement(App));
  } finally {
    if (previous) require.extensions['.tsx'] = previous;
    else delete require.extensions['.tsx'];
    if (previousCss) require.extensions['.css'] = previousCss;
    else delete require.extensions['.css'];
  }
}

function animationCode() {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/scrollAnimations.ts'), 'utf8');
  return compile(source.replace('export function', 'function')) + '\nglobalThis.disposeAnimations = initializeScrollAnimations();';
}

// App imports its typed controller even during server rendering.
require.extensions['.ts'] = (module, filename) => {
  module._compile(compile(fs.readFileSync(filename, 'utf8')), filename);
};

module.exports = { renderPortfolio, animationCode };
