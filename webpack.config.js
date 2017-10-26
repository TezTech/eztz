const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: "./main.js",
  output: {
    filename: "eztz.js"
  },
  node: {
    fs: 'empty'
  },
  plugins: [
    new UglifyJSPlugin()
  ]
}
