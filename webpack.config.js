const {resolve} = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const packageJson = require('./package.json');

module.exports = (args) => {
    const {mode = 'production', target = 'pwa'} = args;
    const __dev__ = mode === 'development';
    const wwwDir = resolve(__dirname, __dev__ ? 'www-dev' : 'app/www');
    // Use a local `.env` file (if it exists) associated with the target environment.
    dotenv.config({path: __dev__ || mode === 'docker' ? './.env' : `./.env.${target}`});
    const env = process.env;

    return {
        mode,
        entry: {
            'lib/music-metadata-browser': 'music-metadata-browser',
            'lib/unidecode': 'unidecode',
            'lib/vendors': [
                'colorjs.io',
                'colorthief',
                'd3-array',
                'd3-interpolate',
                'd3-scale',
                'detect-browser',
                'dexie',
                'libs/dialog-polyfill',
                'fullscreen-api-polyfill',
                'jsfft',
                'idb-keyval',
                'is-electron',
                'md5',
                'react',
                'react-dom',
                'react-error-boundary',
                'spotify-web-api-js',
                'string-score',
                'youtube-player',
                // These are always included in `bundle.js`. Tree-shaking?
                // '@ctrl/tinycolor',
                // 'rxjs',
            ],
            bundle: {
                import: './src/index.tsx',
                dependOn: ['lib/unidecode', 'lib/vendors'],
            },
            'lib/services': {
                import: './src/services/services.ts',
                dependOn: ['lib/vendors', 'bundle'],
            },
            'lib/visualizers': {
                import: './src/services/visualizer/visualizers.ts',
                dependOn: ['lib/vendors', 'bundle'],
            },
        },
        output: {
            chunkFilename: 'lib/[name].js',
            path: `${wwwDir}/v${packageJson.version}`,
        },
        optimization: {
            runtimeChunk: 'single',
            // Concatenate CSS output into one file.
            // The order is dependent on the order of the JS imports above.
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'styles',
                        type: 'css/mini-extract',
                        chunks: 'all',
                        enforce: true,
                    },
                },
            },
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
                __app_name__: JSON.stringify(packageJson.name || ''),
                __app_version__: JSON.stringify(packageJson.version || ''),
                __app_contact__: JSON.stringify(packageJson.author.email || ''),
                __am_dev_token__: JSON.stringify(env.AM_DEV_TOKEN || ''),
                __lf_api_key__: JSON.stringify(env.LF_API_KEY || ''),
                __lf_api_secret__: JSON.stringify(env.LF_API_SECRET || ''),
                __sp_client_id__: JSON.stringify(env.SP_CLIENT_ID || ''),
                __yt_client_id__: JSON.stringify(env.YT_CLIENT_ID || ''),
                __spotify_disabled__: env.SPOTIFY_DISABLED === 'true',
                __youtube_disabled__: env.YOUTUBE_DISABLED === 'true',
                __single_streaming_service__: env.SINGLE_STREAMING_SERVICE === 'true',
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: './src/html/index.html',
                        to: wwwDir,
                        transform(content) {
                            return String(content).replace(/%version%/g, `v${packageJson.version}`);
                        },
                    },
                ],
            }),
            __dev__
                ? undefined
                : new CopyPlugin({
                      patterns: [
                          {
                              from: './src/html/privacy-policy.html',
                              to: wwwDir,
                          },
                          {
                              from: './src/service-worker.js',
                              to: wwwDir,
                              transform(content) {
                                  return String(content)
                                      .replace('%appName%', packageJson.name)
                                      .replace('%appVersion%', packageJson.version)
                                      .replace('%timeStamp%', Date.now());
                              },
                          },
                      ],
                  }),
            ,
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
                libs: resolve(__dirname, 'libs/'),
            },
            extensions: ['.tsx', '.ts', '.js'],
        },
        stats: {
            builtAt: true,
        },
    };
};
