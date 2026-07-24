const path = require('path');

module.exports = (env) => {
  const minimize = env && env.production;
  const mode = minimize ? 'production' : 'development';

  let filename = 'softhphone-vendor-headsets';
  let babelExcludes = [];
  let babelOptions;
  let externals = [];

  /* if we are building for 'module', don't polyfill, transpile, or bundle any dependencies – except stanza because it has node deps... */
  babelExcludes = [/node_modules\/(?!(core\-util\-is|@vbet\/webhid-sdk|@hp\/call-control-sdk)).*/];
  babelOptions = {
    sourceType: 'unambiguous',
    presets: [
      '@babel/preset-env',
      '@babel/preset-typescript'
    ],
    plugins: [
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-optional-chaining',
      '@babel/plugin-transform-nullish-coalescing-operator'
    ]
  };

  filename += minimize ? '.min.js' : '.js';

  console.log(`build mode: ${mode}`);

  return {
    target: 'web',
    entry: './react-app/src/library/index.ts',
    mode,
    optimization: {
      minimize
    },
    externals,
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename,
      library: 'SoftphoneVendorHeadsets',
      libraryExport: '',
      libraryTarget: 'umd'
    },
    resolve: {
      extensions: ['.ts', '.js', '.cjs', '.mjs', '.json']
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: require.resolve('@open-wc/webpack-import-meta-loader'),
        },
        {
          test: /\.(cjs|mjs|js|ts)$/,
          loader: 'babel-loader',
          exclude: babelExcludes,
          options: babelOptions
        }
      ]
    }
  };
};
