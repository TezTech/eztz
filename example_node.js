#!/usr/bin/env node
//Load sodium CLI wrappers
const sodium = require('libsodium-wrappers');
const eztz = require(".").eztz;
const trezorTezos = require("../trezortest");

(async() => {
    await sodium.ready;
    eztz.library.sodium = sodium;
    
		//Run your node code in here
		console.log('test');
		trezorTezos.getAddress("44'/1729'/0'/0'").then(function(d){
			console.log("Got keys", d);	
			trezorTezos.getAddress("44'/1729'/0'/0'").then(function(d){
				console.log("Got keys", d);			
			});	
		});
})();
