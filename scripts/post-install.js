var fs = require("fs");
var path = require("path");
var initCwd = process.env.INIT_CWD

var json = {
  "plugins": ["./node_modules/@firestitch/lint/prettier/angular-prettier-plugin.js"]
};


fs.writeFileSync(path.join(initCwd,'.prettierrc'), JSON.stringify(json, null, 2));