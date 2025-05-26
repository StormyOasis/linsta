/* eslint-disable no-undef */
const webpack = require("webpack");
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require("eslint-webpack-plugin");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = !isDevelopment;

const envFile = isDevelopment ? '.env' : '.env.production';

console.log(`Building for ${isDevelopment ? 'development' : 'production'}... ${envFile}`);

module.exports = {
  name: "client",
  target: "web",
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "source-map" : false,
  entry: path.resolve(__dirname, "src/client/index.tsx"),

  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx", ".json", ".css"],
    modules: ["src", "node_modules"]
  },

  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    chunkFilename: '[id].chunk.js',
  },

  optimization: {
    usedExports: true,
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            unused: true,
            dead_code: true,
          },
        },
      }),
    ],    
  },  

  module: {
    rules: [   
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env', '@babel/preset-react'] },
        }
      },
      {
        test: /\.(css)$/i,
        exclude: /node_modules/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
                modules: {
                  exportLocalsConvention: "camelCaseOnly",
                  localIdentName: "[name]_[local]_[hash:base64:5]",
                },
            },
          },
        ],
      }, 
      {
        test: /\.(png|jpg|gif)$/,
        exclude: /node_modules/,
        use: ["file-loader"]
      },
      {
        test: /\.svg$/i,
        issuer: /\.tsx$/,
        use: ['@svgr/webpack'],
      },    
    ],

  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process',
    }),    
    new Dotenv({
      path: `./${envFile}`
    }), 
    isDevelopment && new ESLintPlugin(),
    isDevelopment && new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist', 'public'),
        },
        { from: "robots.txt", to: "robots.txt" },
      ],
    }),
    isDevelopment &&
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled',
      generateStatsFile: true,
      statsOptions: { source: false },
    }),
  ].filter(Boolean),

  stats: {
    children: false,
    chunks: false,
    chunkGroups: false,
    chunkModules: false,
    colors: true,
    env: true,
    modules: false,
  },
};