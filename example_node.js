#!/usr/bin/env node
//Load sodium CLI wrappers
const sodium = require('libsodium-wrappers');
const eztz = require(".").eztz;

(async() => {
    await sodium.ready;
    eztz.library.sodium = sodium;
    
		//Run your node code in here
		
		//Test libsodium
		var keys1 = eztz.crypto.generateKeys(eztz.crypto.generateMnemonic());
		var keys2 = eztz.crypto.extractKeys(keys1.sk);
		console.log(keys1.pk == keys2.pk);
})();
