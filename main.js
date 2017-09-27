const Buffer = require('buffer/').Buffer,
bs58check = require('bs58check'),
nacl_factory = require("js-nacl"),
sodium = require('libsodium-wrappers'),
bip39 = require('bip39'),
pbkdf2 = require('pbkdf2'),
prefix = {
    tz1: new Uint8Array([6, 161, 159]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk: new Uint8Array([43, 246, 78, 7]),
},
o = function(payload, prefix) {
    var n = new Uint8Array(prefix.length + payload.length);
    n.set(prefix);
    n.set(payload, prefix.length);
    return bs58check.encode(new Buffer(n, 'hex'));
},
p = function(enc, prefix) {
    var n = bs58check.decode(enc);
    n = n.slice(prefix.length);
    return n;
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
    window.nacl = nacl;
    window.eztz = {
        prefix : prefix,
        encodeb58 : o,
        decodeb58 : p,
        generateMnemonic : function(){return bip39.generateMnemonic(160);},
        generateKeysNoSeed : function(){
            var kp = nacl.crypto_sign_keypair();
            return {
                sk : o(kp.signSk, prefix.edsk),
                pk : o(kp.signPk, prefix.edpk),
                pkh : o(sodium.crypto_generichash(20, kp.signPk), prefix.tz1),
            };
        },
        generateKeys : function(m,p){
            var ss = Math.random().toString(36).slice(2);
            var s = bip39.mnemonicToSeed(m, pbkdf2.pbkdf2Sync(p, ss, 3, 32, 'sha512').toString()).slice(0, 32);
            var kp = nacl.crypto_sign_seed_keypair(s);
            return {
                mnemonic : m,
                passphrase : p,
                salt : ss,
                sk : o(kp.signSk, prefix.edsk),
                pk : o(kp.signPk, prefix.edpk),
                pkh : o(sodium.crypto_generichash(20, kp.signPk), prefix.tz1),
            };
        },
        generateKeysFromSeedMulti : function(m,p,n){
            n /= (256^2);
            var s = bip39.mnemonicToSeed(m, pbkdf2.pbkdf2Sync(p, n.toString(36).slice(2), 3, 32, 'sha512').toString()).slice(0, 32);
            var kp = nacl.crypto_sign_seed_keypair(s);
            return {
                mnemonic : m,
                passphrase : p,
                n : n,
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