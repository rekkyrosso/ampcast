const {resolve} = require('path');
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const devKeys = require('../credentials/keys-dev.json');
const prodKeys = require('../credentials/keys-prod.json');
const packageJson = require('./package.json');

module.exports = (env) => {
    const mode = env.mode || 'production';
    const __dev__ = mode === 'development';
    const wwwDir = resolve(__dirname, __dev__ ? 'www-dev' : 'www');
    const keys = __dev__ ? devKeys : prodKeys;

    return {
        entry: './src/index.tsx',
        output: {
            filename: 'bundle.js',
            path: wwwDir,
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.s?css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                        },
                        {
                            loader: 'sass-loader',
                        },
                        {
                            loader: 'postcss-loader',
                        },
                    ],
                },
                {
                    test: /\.frag$/,
                    type: 'asset/source',
                },
            ],
        },
        plugins: [
            new ESLintPlugin({
                extensions: ['.tsx', '.ts'],
            }),
            new MiniCssExtractPlugin({
                filename: 'bundle.css',
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            }),
            new webpack.ProvidePlugin({
                process: 'process/browser',
            }),
            new webpack.DefinePlugin({
                __dev__,
                __app_name__: JSON.stringify(packageJson.name),
                __app_version__: JSON.stringify(packageJson.version),
                __app_contact__: JSON.stringify(packageJson.author.email),
                __am_dev_token__: JSON.stringify(keys.am_dev_token),
                __lf_api_key__: JSON.stringify(keys.lf_api_key),
                __lf_api_secret__: JSON.stringify(keys.lf_api_secret),
                __sp_client_id__: JSON.stringify(keys.sp_client_id),
                __yt_api_key__: JSON.stringify(keys.yt_api_key),
                __yt_client_id__: JSON.stringify(keys.yt_client_id),
            }),
        ],
        resolve: {
            alias: {
                assets: resolve(__dirname, 'src/assets/'),
                components: resolve(__dirname, 'src/components/'),
                hooks: resolve(__dirname, 'src/hooks/'),
                services: resolve(__dirname, 'src/services/'),
                styles: resolve(__dirname, 'src/styles/'),
                types: resolve(__dirname, 'src/types/'),
                utils: resolve(__dirname, 'src/utils/'),
            },
            extensions: ['.tsx', '.ts', '.js'],
        },
        stats: {
            builtAt: true,
        },
        mode,
    };
};
