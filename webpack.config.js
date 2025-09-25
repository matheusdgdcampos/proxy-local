const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/dashboard/index.tsx',
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'dashboard.js',
    publicPath: '/dist/',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
      inject: true,
    }),
  ],
  devtool:
    process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
  devServer: {
    historyApiFallback: true,
    port: 3001,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
};
