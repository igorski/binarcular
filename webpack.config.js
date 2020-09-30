const path              = require('path');
const webpack           = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Is the current build a development build
const IS_DEV = (process.env.NODE_ENV === 'dev');

const dirNode   = 'node_modules';
const dirApp    = path.join(__dirname, 'src');

/**
 * Webpack Configuration
 */
module.exports = {
    entry: {
        typedFileParser: path.join(dirApp, 'index')
    },
    resolve: {
        modules: [
            dirNode,
            dirApp
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            IS_DEV: IS_DEV
        }),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'index.html')
        })
    ],
    module: {
        rules: [
            // BABEL
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /(node_modules)/,
                options: {
                    compact: true
                }
            }
        ]
    }
};
