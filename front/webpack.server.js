const path = require('path');
const nodeExternals = require('webpack-node-externals');

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
    ],
  },
  plugins: [],
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