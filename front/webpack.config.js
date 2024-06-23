const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  entry: "./src/index.tsx",
  mode: "development",
  devtool: "eval-source-map",
  output: {
    filename: "bundle.[fullhash].js",
    path: path.resolve(__dirname, "build"),
  },
  plugins: [
    new ESLintPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),  
  ],
  resolve: {
    modules: [__dirname, "src", "node_modules"],
    extensions: ["*", ".js", ".jsx", ".tsx", ".ts"],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/,
        exclude: /(node_modules|bower_components)/,
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
  devServer: {
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
    },    
    hot: true    
  },  
};