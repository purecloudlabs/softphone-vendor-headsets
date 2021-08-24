const { readFileSync, readFile } = require('fs');
const yargs = require('yargs/yargs');
const webpack = require('webpack');

const argv = {...yargs(process.argv).argv };

delete argv._;
delete argv['$0'];
console.log('Building with arguments:', argv);

if (!argv.deployUrl) {
    if (argv.prod) {
        console.error(
            'Attempting to make a production build without a `deployUrl`.' +
            'Please pass in a `deployUrl` for production builds.\n' +
            '   Example: `npm run build:prod -- --deployUrl=https://cdn.com/my-app/`\n\n' +
            'Provided build arguments', argv
        );
        process.exit(1);
    }
}

if (argv.deployUrl && !argv.deployUrl.endsWith('/')) {
    console.error(
        '`deployUrl` must end with a trailing backlash (`/`). \n\n' +
        'Provided build arguments: ', argv
    );
    process.exit(1);
}

module.exports = {
    node: {
        fs: 'empty'
    },
    resolve: {
        alias: {
            '@app': 'src/app',
            '@environments': 'src/environments',
            '@guards': 'src/app/core/guards',
            '@interceptors': 'src/app/core/interceptors',
            '@repositories': 'src/app/core/repositories',
            '@services': 'src/app/core/services',
            '@shared': 'src/app/shared'
        }
    },
    plugins: [
        new webpack.DefinePlugin({
            __CDN_URL__: JSON.stringify(argv.deployUrl || '')
        })
    ]
}