const {resolve} = require('path');
const webpack = require('webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const packageJson = require('./package.json');

module.exports = (env) => {
    const mode = env.mode || 'production';
    const __dev__ = mode === 'development';
    const credentials = resolve(__dirname, `../credentials`);
    const wwwDir = resolve(__dirname, __dev__ ? 'www-dev' : 'www');

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
                    ],
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
                __am_dev_token__: JSON.stringify(require(`${credentials}/am_dev_token.json`)),
                __lf_api_key__: JSON.stringify(require(`${credentials}/lf_api_key.json`)),
                __lf_api_secret__: JSON.stringify(require(`${credentials}/lf_api_secret.json`)),
                __sp_client_id__: JSON.stringify(require(`${credentials}/sp_client_id.json`)),
                __yt_api_key__: JSON.stringify(require(`${credentials}/yt_api_key.json`)),
                __yt_client_id__: JSON.stringify(require(`${credentials}/yt_client_id.json`)),
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
