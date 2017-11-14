const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: "./src/main.js",
  output: {
    filename: "./dist/eztz.min.js"
  },
  node: {
    fs: 'empty'
  },
  plugins: [
    new UglifyJSPlugin()
  ]
}
