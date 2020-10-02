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
        ],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    module: {
        rules: [
            {
                // inline Workers as Blobs

                test: /\.worker\.js$/,
                use: { loader: 'worker-loader', options: { inline: 'fallback' } }
            },
            {
                // Babel

                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /(node_modules)/,
                options: {
                    compact: true
                }
            },
        ]
    }
};

/* local development (includes examples application) */
const browserConfig = {
    ...config,
    entry: {
        example: path.join(__dirname, 'example/example.js'),
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'example/example.html'),
        })
    ],
    output: {
        filename: 'typed-file-parser.min.js',
        path: path.resolve( __dirname, 'dist' )
    }
};

/* production builds for requireJS and CommonJS/ES6 modules */
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
