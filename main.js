const Buffer = require('buffer/').Buffer,
base58check = require('base58check'),
nacl_factory = require("js-nacl"),
sodium = require('libsodium-wrappers'),
bip39 = require('bip39'),
prefix = {
    tz1: new Uint8Array([6, 161, 159]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk: new Uint8Array([43, 246, 78, 7]),
},
o = function(payload, prefix) {
    return base58check.encode(sodium.to_hex(payload), sodium.to_hex(prefix));
};
var eztz_ready_function = false;
window.eztz_ready = function(e){
    if (typeof window.eztz != 'undefined') {
        e(window.eztz);
    } else {
        eztz_ready_function = e;
    }
}
nacl_factory.instantiate(function (nacl) {
    window.eztz = {
        generateMnemonic : function(){return bip39.generateMnemonic(160);},
        generateKeys : function(m,p){
            var s = bip39.mnemonicToSeed(m, p).slice(0, 32);
            var kp = nacl.crypto_sign_seed_keypair(s);
            return {
                mnemonic : m,
                passphrase : p,
                sk : o(kp.signSk, prefix.edsk),
                pk : o(kp.signPk, prefix.edpk),
                pkh : o(sodium.crypto_generichash(20, kp.signPk), prefix.tz1),
            };
        },
    };
    if (eztz_ready_function){
        eztz_ready_function(window.eztz);
    }
});