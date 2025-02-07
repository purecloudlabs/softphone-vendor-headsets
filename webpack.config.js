const path = require('path');

module.exports = (env) => {
  const minimize = env && env.production;
  const mode = minimize ? 'production' : 'development';

  let filename = 'softhphone-vendor-headsets';
  let babelExcludes = [];
  let babelOptions;
  // let externals = ['@gnaudio/jabra-js'];

  /* if we are building for 'module', don't polyfill, transpile, or bundle any dependencies – except stanza because it has node deps... */
  babelExcludes = [/node_modules\/(?!(core\-util\-is)).*/];

  babelOptions = {
    sourceType: 'unambiguous',
    presets: [
      '@babel/preset-env',
      '@babel/preset-typescript'
    ],
    plugins: [
      '@babel/plugin-proposal-class-properties'
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
    externals: '@gnaudio/jabra-js',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename,
      library: 'SoftphoneVendorHeadsets',
      // TODO: exporting the SDK class here does not allow CDN imports access to any
      //  other files/modules of this lib. See: https://inindca.atlassian.net/browse/PCM-1708
      // libraryExport: '',
      libraryTarget: 'umd'
    },
    resolve: {
      extensions: ['.ts', '.js', '.cjs', '.mjs', '.json']
    },
    module: {
      rules: [
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
