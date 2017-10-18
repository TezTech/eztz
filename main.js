const Buffer = require('buffer/').Buffer,
defaultProvider = "https://tezrpc.me/api",
library = {
  bs58check : require('bs58check'),
  sodium : require('libsodium-wrappers'),
  bip39 : require('bip39'),
  pbkdf2 : require('pbkdf2'),
},
prefix = {
    tz1: new Uint8Array([6, 161, 159]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk: new Uint8Array([43, 246, 78, 7]),
    edsig: new Uint8Array([9, 245, 205, 134, 18]),
    o: new Uint8Array([5, 116]),
},
utility = {
  b58cencode : function(payload, prefix) {
      var n = new Uint8Array(prefix.length + payload.length);
      n.set(prefix);
      n.set(payload, prefix.length);
      return library.bs58check.encode(new Buffer(n, 'hex'));
  },
  b58cdecode : function(enc, prefix) {
      var n = library.bs58check.decode(enc);
      n = n.slice(prefix.length);
      return n;
  },
  generateMnemonic : function(){
    return library.bip39.generateMnemonic(160)
  },
  checkAddress : function(a){
    try {
      this.b58cdecode(a, prefix.tz1);
      return true;
    } 
    catch (e){
      return false;
    }
  },
  buf2hex : function(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  },
  hex2buf : function(hex){
      return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
      }));
  },
  hexNonce : function(length) {
    var chars = '0123456789abcedf';
    var hex = '';
    while(length--) hex += chars[(Math.random() * 16) | 0];
    return hex;
  }
},
crypto = {
  generateKeysNoSeed : function(){
        var kp = library.sodium.crypto_sign_keypair();
        return {
            sk : utility.b58cencode(kp.privateKey, prefix.edsk),
            pk : utility.b58cencode(kp.publicKey, prefix.edpk),
            pkh : utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
        };
    },
  generateKeysSalted : function(m,p){
      var ss = Math.random().toString(36).slice(2);
      var pp = library.pbkdf2.pbkdf2Sync(p, ss, 0, 32, 'sha512').toString();
      var s = library.bip39.mnemonicToSeed(m, pp).slice(0, 32);
      var kp = library.sodium.crypto_sign_seed_keypair(s);
      return {
          mnemonic : m,
          passphrase : p,
          salt : ss,
          sk : utility.b58cencode(kp.privateKey, prefix.edsk),
          pk : utility.b58cencode(kp.publicKey, prefix.edpk),
          pkh : utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
      };
  },
  generateKeys : function(m,p){
      var s = library.bip39.mnemonicToSeed(m, p).slice(0, 32);
      var kp = library.sodium.crypto_sign_seed_keypair(s);
      return {
          mnemonic : m,
          passphrase : p,
          sk : utility.b58cencode(kp.privateKey, prefix.edsk),
          pk : utility.b58cencode(kp.publicKey, prefix.edpk),
          pkh : utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
      };
  },
  generateKeysFromSeedMulti : function(m,p,n){
      n /= (256^2);
      var s = library.bip39.mnemonicToSeed(m, library.pbkdf2.pbkdf2Sync(p, n.toString(36).slice(2), 0, 32, 'sha512').toString()).slice(0, 32);
      var kp = library.sodium.crypto_sign_seed_keypair(s);
      return {
          mnemonic : m,
          passphrase : p,
          n : n,
          sk : utility.b58cencode(kp.privateKey, prefix.edsk),
          pk : utility.b58cencode(kp.publicKey, prefix.edpk),
          pkh : utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
      };
  },
  sign : function(bytes, sk){
    var sig = library.sodium.crypto_sign_detached(utility.hex2buf(bytes), utility.b58cdecode(sk, prefix.edsk), 'uint8array');
    var edsig = utility.b58cencode(sig, prefix.edsig);
    var sbytes = bytes + utility.buf2hex(sig);
    return {
      bytes: bytes,
      sig: sig,
      edsig: edsig,
      sbytes: sbytes,
    }
  },
  verify : function(bytes, sig, pk){
    return library.sodium.crypto_sign_verify_detached(sig, utility.hex2buf(bytes), utility.b58cdecode(pk, prefix.edpk));
  },
}
node = {
  setProvider : function(u){
    activeProvider = u;
  },
  resetProvider : function(){
    activeProvider = defaultProvider;
  },
  query :function(e, o){
    if (typeof o == 'undefined') o = {};
    return new Promise(function (resolve, reject) {
      var http = new XMLHttpRequest();
      http.open("POST", activeProvider + e, true);
      http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      http.onload = function() {
          if(http.status == 200) {
             if (http.responseText){
                  var r = JSON.parse(http.responseText);
                  if (typeof r.ok != 'undefined') r = r.ok;
                  resolve(r);
             } else {
                 reject("Empty response returned");
             }
          } else {
            reject(http.statusText);
          }
      }
      http.onerror = function() { 
        reject(http.statusText);
      }
      http.send(JSON.stringify(o));
    });
  }
},
rpc = {
  getBalance : function(pkh){
    return node.query("/blocks/prevalidation/proto/context/contracts/"+pkh+"/balance");
  },
  getHead : function(){
    return node.query("/blocks/head");
  },
  sendOperation : function(operation, keys, fee){
    var head, counter, pred_block, sopbytes;
    return node.query('/blocks/head')
    .then(function(f){ 
      head = f;
      return node.query('/blocks/prevalidation/proto/context/contracts/'+keys.pkh+'/counter');
    })
    .then(function(f){
      counter = f+1;
      return node.query('/blocks/prevalidation/predecessor');
    })
    .then(function(f){ 
      pred_block = f.predecessor;
      return node.query('/blocks/prevalidation/proto/helpers/forge/operations', {
          "net_id": head.net_id,
          "branch": pred_block,
          "source": keys.pkh,
          "public_key": keys.pk,
          "fee": fee,
          "counter": counter,
          "operations": [operation]
      });
    })
    .then(function(f){ 
      var opbytes = f.operation;
      var signed = crypto.sign(opbytes, keys.sk);
      sopbytes = signed.sbytes;
      var oh = utility.b58cencode(library.sodium.crypto_generichash(32, utility.hex2buf(sopbytes)), prefix.o);
      return node.query('/blocks/prevalidation/proto/helpers/apply_operation', {
          "pred_block": pred_block,
          "operation_hash": oh,
          "forged_operation": opbytes,
          "signature": signed.edsig
      });
    })
    .then(function(f){
      return node.query('/inject_operation', {
         "signedOperationContents" : sopbytes, 
      });
    });
  },
},
contract = {//TODO
  
};
var activeProvider = defaultProvider;
//Expose library
window.eztz = {
  library : library,
  prefix : prefix,
  utility : utility,
  crypto : crypto,
  node : node,
  rpc : rpc,
  contract : contract,
};

//Alpha only functions
window.eztz.alphanet = {};
window.eztz.alphanet.faucet = function(toAddress){
  var keys = crypto.generateKeysNoSeed();
  var head, pred_block, opbytes, npkh;
  return node.query('/blocks/head')
  .then(function(f){
    head = f;
    return node.query('/blocks/prevalidation/predecessor');
  })
  .then(function(f){
    pred_block = f.predecessor;
    return node.query('/blocks/prevalidation/proto/helpers/forge/operations', {
        "net_id": head.net_id,
        "branch": pred_block,
        "operations": [{
            "kind" : "faucet",
            "id" : keys.pkh,
            "nonce" : utility.hexNonce(32)
        }]
    });
  })
  .then(function(f){ 
    opbytes = f.operation;
    var operationHash = utility.b58cencode(library.sodium.crypto_generichash(32, utility.hex2buf(opbytes)), prefix.o);
    return node.query('/blocks/prevalidation/proto/helpers/apply_operation', {
        "pred_block": pred_block,
        "operation_hash": operationHash,
        "forged_operation": opbytes,
    });
  })
  .then(function(f){
    npkh = f.contracts[0];
    return node.query('/inject_operation', {
       "signedOperationContents" : opbytes,
        "force" : false,
    });
  })
  .then(function(f){
    return node.query('/blocks/prevalidation/proto/context/contracts/'+npkh+'/manager');
  })
  .then(function(f){
      //Transfer from free account
      keys.pkh = npkh;
      var operation = {
        "kind": "transaction",
        "amount": 10000000,
        "destination": toAddress
      };
      return rpc.sendOperation(operation, keys, 0);
  });
}