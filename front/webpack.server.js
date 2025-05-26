const webpack = require("webpack");
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const Dotenv = require('dotenv-webpack');

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = !isDevelopment;

const envFile = isDevelopment ? '.env' : '.env.production';

console.log(`Building for ${isDevelopment ? 'development' : 'production'}... ${envFile}`);

module.exports = {
  name: "server",
  target: 'node',
  mode: 'development',
  entry: path.resolve(__dirname, "src/server/server.tsx"),
  externals: [nodeExternals()],
  
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx", "json"],
    modules: ["src", "node_modules"], 
  },
    
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js',
    publicPath: '/',
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
        test: /\.svg$/i,
        issuer: /\.tsx$/,
        use: ['@svgr/webpack'],
      },     
      {
        test: /\.(png|jpg|gif)$/,
        exclude: /node_modules/,
        use: ["file-loader"]
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
    ],
  },
  plugins: [   
    new Dotenv({
      path: `./${envFile}`
    }),   
  ],
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkGroups: false,
    chunkModules: false,
    env: true,
    children: false,
  },
};