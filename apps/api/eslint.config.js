// The rules live in eslint.base.js so the module backends can share them.
module.exports = require('./eslint.base.js')(__dirname, ['{src,apps,libs}/**/*.ts']);
