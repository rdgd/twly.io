var webpack = require('webpack');
var path = require('path');

module.exports = {
  context: __dirname + '/',
  entry: './client/index.js',
  output: {
    path: __dirname + '/assets/js',
    filename: 'bundle.js',
  },
  devtool: 'source-map',
  module: {
    loaders: [
      {
        // "test" is commonly used to match the file extension
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "client")
        //  path.resolve(__dirname, "app/test")
        ],
        loader: "babel-loader", // or "babel" because webpack adds the '-loader' automatically
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};