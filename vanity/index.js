#!/usr/bin/env node
const _sodium = require('libsodium-wrappers');
(async() => {
    if (process.argv.length <= 2){
        console.log("Please enter a term to find, e.g. node index.js test");
        return;
    }
    var match = process.argv[2];
    await _sodium.ready;
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var ee = require("./main.js");
    var eztz = ee.eztz;
    eztz.library.sodium = _sodium;
    var keys, fmatch = "tz1" + match;
    console.log("Searching for " + fmatch);
    var cc = 0;
    function tick() {
        keys = eztz.crypto.generateKeysNoSeed();
        if (keys.pkh.substr(0, fmatch.length) == fmatch){
            console.log("\nFound match:");
            console.log(keys);
        } else {
            printProgress("Checked " + cc++ + " hashes");
            setImmediate(tick);
        }
    }
    tick();
})();

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}