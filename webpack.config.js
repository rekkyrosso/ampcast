const {resolve} = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const ESLintPlugin = require('eslint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const packageJson = require('./package.json');
const {rimrafSync} = require('rimraf');

module.exports = (args) => {
    const {mode = 'production', target = 'pwa'} = args;
    const __dev__ = mode === 'development';
    const wwwDir = resolve(__dirname, __dev__ ? 'www-dev' : 'app/www');

    // .env
    const hasServerEnv = __dev__ || target === 'docker';
    if (!hasServerEnv) {
        // Use a local `.env` file (if it exists) associated with the target environment.
        dotenv.config({path: `./.env.${target}`});
    }
    const env = process.env;

    // icecast-metadata-player libs.
    const icecastPlayerPath =
        './node_modules/icecast-metadata-player/build/icecast-metadata-player';
    const icecastPlayerVersion = '1.17.13';
    const icecastPlayer = `${icecastPlayerPath}-${icecastPlayerVersion}`;

    if (__dev__) {
        rimrafSync(wwwDir);
    } else {
        rimrafSync(`${wwwDir}/v${packageJson.version}`);
    }

    const encodeString = (string) => {
        const encoder = new TextEncoder();
        return encoder.encode(string).join(',');
    };

    const getEnv = (key) => {
        if (hasServerEnv) {
            return `'%${key}%'`;
        } else {
            return `'${encodeString(env[key] || '')}'`;
        }
    };

    const getPersonalMediaServers = () => {
        if (hasServerEnv) {
            return `'%PERSONAL_MEDIA_SERVERS%'`;
        } else {
            return `'${encodeString('{}')}'`;
        }
    };

    return {
        mode,
        entry: {
            'lib/music-metadata': 'music-metadata',
            // 'lib/tidal-player': '@tidal-music/player',
            'lib/unidecode': 'unidecode',
            'lib/vendors': [
                'colorjs.io',
                'colorthief',
                'd3-array',
                'd3-interpolate',
                'd3-scale',
                'detect-browser',
                'dexie',
                'jsfft',
                'idb-keyval',
                'is-electron',
                'md5',
                'minisearch',
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
            'lib/media-services': {
                import: './src/services/mediaServices/all.ts',
                dependOn: ['bundle'],
            },
            'lib/visualizers': {
                import: './src/services/visualizer/visualizers.ts',
                dependOn: ['bundle'],
            },
        },
        output: {
            chunkFilename: 'lib/[name].js',
            path: `${wwwDir}/v${packageJson.version}`,
        },
        optimization: {
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    // Concatenate CSS output into one file.
                    // The order is dependent on the order of the JS imports above.
                    styles: {
                        name: 'styles',
                        type: 'css/mini-extract',
                        chunks: 'all',
                        enforce: true,
                    },
                    // Prevent imported libraries from splitting.
                    'lib/music-metadata': {
                        name: 'lib/music-metadata',
                        test: /[\\/]node_modules[\\/](music\-metadata)[\\/]/,
                        chunks: 'all',
                        enforce: true,
                    },
                    // 'lib/tidal-player': {
                    //     name: 'lib/tidal-player',
                    //     test: /[\\/]node_modules[\\/](@tidal\-music[\\/]player)[\\/]/,
                    //     chunks: 'all',
                    //     enforce: true,
                    // },
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
                            loader: 'postcss-loader',
                        },
                        {
                            loader: 'sass-loader',
                        },
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.frag$/,
                    type: 'asset/source',
                    exclude: /node_modules/,
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
            new webpack.DefinePlugin({
                __dev__,
                __target__: JSON.stringify(target),
                __app_name__: JSON.stringify(packageJson.name || ''),
                __app_version__: JSON.stringify(packageJson.version || ''),
                __app_contact__: JSON.stringify(packageJson.author.email || ''),
                __am_dev_token__: getEnv('APPLE_MUSIC_DEV_TOKEN'),
                __lf_api_key__: getEnv('LASTFM_API_KEY'),
                __lf_api_secret__: getEnv('LASTFM_API_SECRET'),
                __sp_client_id__: getEnv('SPOTIFY_CLIENT_ID'),
                __td_client_id__: getEnv('TIDAL_CLIENT_ID'),
                __yt_client_id__: getEnv('GOOGLE_CLIENT_ID'),
                __enabled_services__: getEnv('ENABLED_SERVICES'),
                __startup_services__: getEnv('STARTUP_SERVICES'),
                __personal_media_servers__: getPersonalMediaServers(),
                __single_streaming_service__: env.SINGLE_STREAMING_SERVICE === 'true',
                __icecast_player_version__: JSON.stringify(icecastPlayerVersion),
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
                    // icecast-metadata-player libs
                    {
                        from: `${icecastPlayer}.main.min.js`,
                        to: `${wwwDir}/v${packageJson.version}/lib`,
                    },
                    {
                        from: `${icecastPlayer}.main.min.js.LICENSE.txt`,
                        to: `${wwwDir}/v${packageJson.version}/lib`,
                    },
                    {
                        from: `${icecastPlayer}.mediasource.min.js`,
                        to: `${wwwDir}/v${packageJson.version}/lib`,
                    },
                    {
                        from: `${icecastPlayer}.synaudio.min.js`,
                        to: `${wwwDir}/v${packageJson.version}/lib`,
                    },
                ],
            }),
            __dev__
                ? undefined
                : new CopyPlugin({
                      patterns: [
                          {
                              from: './src/service-worker.js',
                              to: wwwDir,
                          },
                          {
                              from: './src/service-worker-v2.js',
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
