const path                   = require('path');
const webpack                = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin      = require('html-webpack-plugin');

// Is the current build a development build
const IS_DEV = (process.env.NODE_ENV === 'dev');

const dirNode   = 'node_modules';
const dirApp    = path.join(__dirname, 'src');

/**
 * Webpack Configuration
 */
const config = {
    entry: {
        typedFileParser: path.join(dirApp, 'index')
    },
    resolve: {
        modules: [
            dirNode,
            dirApp
        ]
    },
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

const browserConfig = {
    ...config,
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'index.html')
        })
    ],
    output: {
        filename: 'typed-file-parser.min.js',
        path: path.resolve( __dirname, 'dist' )
    }
};

const amdConfig = {
    ...config,
    output: {
        filename: 'typed-file-parser.amd.js',
        path: path.resolve( __dirname, 'dist' ),
        libraryTarget: 'amd',
        umdNamedDefine: true
    }
};

const moduleConfig = {
    ...config,
    output: {
        filename: 'typed-file-parser.js',
        path: path.resolve( __dirname, 'dist' ),
        libraryTarget: 'commonjs-module',
        umdNamedDefine: true
    }
};

module.exports = [
    browserConfig, amdConfig, moduleConfig
];
