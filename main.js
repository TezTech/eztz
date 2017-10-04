const Buffer = require('buffer/').Buffer,
bs58check = require('bs58check'),
sodium = require('libsodium-wrappers'),
bip39 = require('bip39'),
pbkdf2 = require('pbkdf2'),
prefix = {
    tz1: new Uint8Array([6, 161, 159]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk: new Uint8Array([43, 246, 78, 7]),
    edsig: new Uint8Array([9, 245, 205, 134, 18]),
    o: new Uint8Array([5, 116]),
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
},
tz_rpc = function(e, o, f){
    var http = new XMLHttpRequest();
    http.open("POST", rpcurl + e, true);
    http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    http.onreadystatechange = function() {
        if(http.readyState == 4 && http.status == 200) {
            var r = JSON.parse(http.responseText);
            if (typeof r.ok != 'undefined') r = r.ok;
            f(r);
        }
    }
    http.send(JSON.stringify(o));
},
buf2hex = function(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
},
hex2buf = function(hex){
    return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16)
    }));
};
var eztz_ready_function = false,
rpcurl = 'http://173.254.236.122/rpc.php?url=';
window.eztz_ready = function(e){
    if (typeof window.eztz != 'undefined') {
        e(window.eztz);
    } else {
        eztz_ready_function = e;
    }
}
window.eztz = {
    prefix : prefix,
    encodeb58 : o,
    decodeb58 : p,
    setRpcUrl : function(u){ rpcurl = u; },
    sendOperation : function(operation, keys, fee, r){
        try{
        tz_rpc('/blocks/head', {}, function(f){ 
            var head = f;
            tz_rpc('/blocks/prevalidation/proto/context/contracts/'+keys.pkh+'/counter', {}, function(f){
                var counter = f+1;
                tz_rpc('/blocks/prevalidation/predecessor', {}, function(f){ 
                    var pred_block = f.predecessor;
                    tz_rpc('/blocks/prevalidation/proto/helpers/forge/operations', {
                        "net_id": head.net_id,
                        "branch": pred_block,
                        "source": keys.pkh,
                        "public_key": keys.pk,
                        "fee": fee,
                        "counter": counter,
                        "operations": [operation]
                    }, function(f){ 
                        var opbytes = f.operation;
                        var ok = sodium.crypto_sign_detached(hex2buf(opbytes), p(keys.sk, prefix.edsk), 'uint8array');
                        var ok58 = o(ok, prefix.edsig);
                        var sopbytes = opbytes + buf2hex(ok);
                        
                        var operationHash = o(sodium.crypto_generichash(32, hex2buf(sopbytes), 'uint8array'), prefix.o);
                        tz_rpc('/blocks/prevalidation/proto/helpers/apply_operation', {
                            "pred_block": pred_block,
                            "operation_hash": operationHash,
                            "forged_operation": opbytes,
                            "signature": ok58
                        }, function(f){
                            tz_rpc('/inject_operation', {
                               "signedOperationContents" : sopbytes, 
                            }, r);
                        });
                    });
                });
            });
        });
        } catch (e){
            r(e);
        }
    },
    generateMnemonic : function(){return bip39.generateMnemonic(160);},
    generateKeysNoSeed : function(){
        var kp = sodium.crypto_sign_keypair();
        return {
            sk : o(kp.privateKey, prefix.edsk),
            pk : o(kp.publicKey, prefix.edpk),
            pkh : o(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    },
    generateKeysSalted : function(m,p){
        var ss = Math.random().toString(36).slice(2);
        var pp = pbkdf2.pbkdf2Sync(p, ss, 0, 32, 'sha512').toString();
        var s = bip39.mnemonicToSeed(m, pp).slice(0, 32);
        var kp = sodium.crypto_sign_seed_keypair(s);
        return {
            mnemonic : m,
            passphrase : p,
            salt : ss,
            sk : o(kp.privateKey, prefix.edsk),
            pk : o(kp.publicKey, prefix.edpk),
            pkh : o(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    },
    generateKeys : function(m,p){
        var s = bip39.mnemonicToSeed(m, p).slice(0, 32);
        var kp = sodium.crypto_sign_seed_keypair(s);
        return {
            mnemonic : m,
            passphrase : p,
            sk : o(kp.privateKey, prefix.edsk),
            pk : o(kp.publicKey, prefix.edpk),
            pkh : o(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    },
    generateKeysFromSeedMulti : function(m,p,n){
        n /= (256^2);
        var s = bip39.mnemonicToSeed(m, pbkdf2.pbkdf2Sync(p, n.toString(36).slice(2), 0, 32, 'sha512').toString()).slice(0, 32);
        var kp = sodium.crypto_sign_seed_keypair(s);
        return {
            mnemonic : m,
            passphrase : p,
            n : n,
            sk : o(kp.privateKey, prefix.edsk),
            pk : o(kp.publicKey, prefix.edpk),
            pkh : o(sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    },
};
if (eztz_ready_function){
    eztz_ready_function(window.eztz);
}