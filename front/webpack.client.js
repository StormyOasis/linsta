const webpack = require("webpack");
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require("eslint-webpack-plugin");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = !isDevelopment;

module.exports = {
  name: "client",
  target: "web",
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "source-map" : false,
  entry: path.resolve(__dirname, "src/client/index.tsx"),

  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx", "json"],
    modules: ["src", "node_modules"],
  },

  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    chunkFilename: '[id].chunk.js',
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
        exclude: /node_modules/,
        test: /\.(css)$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        exclude: /node_modules/,
        use: ["file-loader"]
      },
    ],

  },
  plugins: [
    new ESLintPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist', 'public'),
        },
      ],
    }),
    isProduction &&
    new BundleAnalyzerPlugin({
      analyzerMode: 'disabled',
      generateStatsFile: true,
      statsOptions: { source: false },
    }),
  ].filter(Boolean),
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
  },
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