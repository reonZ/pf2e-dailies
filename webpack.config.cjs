// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path')
const RemovePlugin = require('remove-files-webpack-plugin')

const isProduction = process.env.NODE_ENV == 'production'

const config = {
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'scripts'),
    },
    devtool: 'source-map',
    plugins: [
        new RemovePlugin({
            before: {
                include: ['./scripts'],
            },
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
                options: {
                    transpileOnly: true,
                },
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
        alias: {
            '@utils': 'D:/foundryVTT-projects/@utils/',
            '@apps': path.resolve(__dirname, 'src/apps/'),
            '@src': path.resolve(__dirname, 'src/'),
        },
    },
}

module.exports = () => {
    if (isProduction) {
        config.mode = 'production'
    } else {
        config.mode = 'development'
    }
    return config
}
