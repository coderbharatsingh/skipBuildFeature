const mix = require('laravel-mix');
const CompressionPlugin = require('compression-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');
const sources = require('./build-sources');
const { getBuildPaths } = require('./common-methods');
require('laravel-mix-merge-manifest');
const buildPaths = getBuildPaths(sources);

const initMix = (paths, returnMix = false) => {
    mix.sourceMaps(!mix.inProduction(), 'source-map').mergeManifest();

    if (!returnMix) {
        const pathValues = Object.values(paths);
        if (pathValues.length < 1) {
            return null;
        }

        for (let i = 0; i < pathValues.length; i++) {
            if (Object.keys(pathValues[i]).length) {
                break;
            } else if (i >= pathValues.length - 1) {
                return null;
            }
        }
    }

    if (mix.inProduction()) {
        mix.webpackConfig((webpack) => {
            return {
                plugins: [
                    new CompressionPlugin({
                        filename: '[path][base].gz',
                        algorithm: 'gzip',
                        test: /\.(js|css|html|svg)$/,
                        compressionOptions: { level: 9 },
                        threshold: 10240,
                        minRatio: 0.8,
                    }),
                    new BrotliPlugin({
                        asset: '[path].br',
                        test: /\.(js|css|html|svg)$/,
                        threshold: 10240,
                        minRatio: 0.8,
                    }),
                ],
            };
        });
    } else {
        mix.version();
        mix.options({
            hmrOptions: {
                host: 'laravel.test',
                port: 3301,
            },
        });

        mix.webpackConfig({
            devServer: {
                client: {
                    progress: true,
                    reconnect: 5,
                    overlay: {
                        warnings: false,
                        errors: true,
                        runtimeErrors: true,
                    },
                },
            },
            resolve: {
                alias: {
                    '@common-components': 'resources/src/sites/common/components',
                },
            },
        });
    }

    return mix;
};

module.exports = { initMix, buildPaths };
