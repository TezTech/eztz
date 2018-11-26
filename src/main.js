if (typeof Buffer == "undefined") Buffer = require("buffer/").Buffer;
if (typeof XMLHttpRequest == "undefined") XMLHttpRequest = require('xhr2');
const BN = require("bignumber.js");
const 
//CLI below
defaultProvider = "https://rpc.tezrpc.me/",
counters = {},
library = {
  bs58check: require('bs58check'),
  sodium: require('libsodium-wrappers'),
  bip39: require('bip39'),
  pbkdf2: require('pbkdf2')
},
prefix = {
  tz1: new Uint8Array([6, 161, 159]),
  tz2: new Uint8Array([6, 161, 161]),
  tz3: new Uint8Array([6, 161, 164]),
  KT: new Uint8Array([2,90,121]),
  
  
  edpk: new Uint8Array([13, 15, 37, 217]),
  edsk2: new Uint8Array([13, 15, 58, 7]),
  spsk: new Uint8Array([17, 162, 224, 201]),
  p2sk: new Uint8Array([16,81,238,189]),
  
  sppk: new Uint8Array([3, 254, 226, 86]),
  p2pk: new Uint8Array([3, 178, 139, 127]),
  
  edesk: new Uint8Array([7, 90, 60, 179, 41]),
  
  edsk: new Uint8Array([43, 246, 78, 7]),
  edsig: new Uint8Array([9, 245, 205, 134, 18]),
  spsig1: new Uint8Array([13, 115, 101, 19, 63]),
  p2sig: new Uint8Array([54, 240, 44, 52]),
  sig: new Uint8Array([4, 130, 43]),
  
  Net: new Uint8Array([87, 82, 0]),
  nce: new Uint8Array([69, 220, 169]),
  b: new Uint8Array([1,52]),
  o: new Uint8Array([5, 116]),
  Lo: new Uint8Array([133, 233]),
  LLo: new Uint8Array([29, 159, 109]),
  P: new Uint8Array([2, 170]),
  Co: new Uint8Array([79, 179]),
  id: new Uint8Array([153, 103]),
},
watermark = {
  block: new Uint8Array([1]),
  endorsement: new Uint8Array([2]),
  generic: new Uint8Array([3]),
},
utility = {
  totez: m => parseInt(m) / 1000000,
  mutez: function (tz) {
    return new BN(new BN(tz).toFixed(6)).multipliedBy(1000000).toString()
  },
  b58cencode: function (payload, prefix) {
    const n = new Uint8Array(prefix.length + payload.length);
    n.set(prefix);
    n.set(payload, prefix.length);
    return library.bs58check.encode(new Buffer(n, 'hex'));
  },
  b58cdecode: function(enc, prefix) { return library.bs58check.decode(enc).slice(prefix.length)},
  buf2hex: function (buffer) {
    const byteArray = new Uint8Array(buffer), hexParts = [];
    for (let i = 0; i < byteArray.length; i++) {
      let hex = byteArray[i].toString(16);
      let paddedHex = ('00' + hex).slice(-2);
      hexParts.push(paddedHex);
    }
    return hexParts.join('');
  },
  hex2buf : function(hex){
      return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
      }));
  },
  hexNonce: function (length) {
    var chars = '0123456789abcedf';
    var hex = '';
    while (length--) hex += chars[(Math.random() * 16) | 0];
    return hex;
  },
  mergebuf : function(b1,b2){
    var r = new Uint8Array(b1.length+b2.length);
    r.set(b1);
    r.set(b2, b1.length);
    return r;
  },
  sexp2mic: function me(mi) {
    mi = mi.replace(/(?:@[a-z_]+)|(?:#.*$)/mg, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (mi.charAt(0) === "(") mi = mi.slice(1, -1);
    let pl = 0;
    let sopen = false;
    let escaped = false;
    let ret = {
      prim: '',
      args: []
    };
    let val = "";
    for (let i = 0; i < mi.length; i++) {
      if (escaped) {
        val += mi[i];
        escaped = false;
        continue;
      }
      else if ((i === (mi.length - 1) && sopen === false) || (mi[i] === " " && pl === 0 && sopen === false)) {
        if (i === (mi.length - 1)) val += mi[i];
        if (val) {
          if (val === parseInt(val).toString()) {
            if (!ret.prim) return {"int": val};
            else ret.args.push({"int": val});
          } else if (val[0] == '0') {
            if (!ret.prim) return {"bytes": val};
            else ret.args.push({"bytes": val});
          } else if (ret.prim) {
            ret.args.push(me(val));
          } else {
            ret.prim = val;
          }
          val = '';
        }
        continue;
      }
      else if (mi[i] === '"' && sopen) {
        sopen = false;
        if (!ret.prim) return {'string': val};
        else ret.args.push({'string': val});
        val = '';
        continue;
      }
      else if (mi[i] === '"' && !sopen && pl === 0) {
        sopen = true;
        continue;
      }
      else if (mi[i] === '\\') escaped = true;
      else if (mi[i] === "(") pl++;
      else if (mi[i] === ")") pl--;
      val += mi[i];
    }
    return ret;
  },
  mic2arr: function me2(s) {
    let ret = [];
    if (s.hasOwnProperty("prim")) {
      if (s.prim === "Pair") {
        ret.push(me2(s.args[0]));
        ret = ret.concat(me2(s.args[1]));
      } else if (s.prim === "Elt") {
        ret = {
          key: me2(s.args[0]),
          val: me2(s.args[1])
        };
      } else if (s.prim === "True") {
        ret = true
      } else if (s.prim === "False") {
        ret = false;
      }
    } else {
      if (Array.isArray(s)) {
        let sc = s.length;
        for (let i = 0; i < sc; i++) {
          let n = me2(s[i]);
          if (typeof n.key !== 'undefined') {
            if (Array.isArray(ret)) {
              ret = {
                keys: [],
                vals: [],
              };
            }
            ret.keys.push(n.key);
            ret.vals.push(n.val);
          } else {
            ret.push(n);
          }
        }
      } else if (s.hasOwnProperty("string")) {
        ret = s.string;
      } else if (s.hasOwnProperty("int")) {
        ret = parseInt(s.int);
      } else {
        ret = s;
      }
    }
    return ret;
  },
  ml2mic: function me(mi) {
    let ret = [], inseq = false, seq = '', val = '', pl = 0, bl = 0, sopen = false, escaped = false;
    for (let i = 0; i < mi.length; i++) {
      if (val === "}" || val === ";") {
        val = "";
      }
      if (inseq) {
        if (mi[i] === "}") {
          bl--;
        } else if (mi[i] === "{") {
          bl++;
        }
        if (bl === 0) {
          let st = me(val);
          ret.push({
            prim: seq.trim(),
            args: [st]
          });
          val = '';
          bl = 0;
          inseq = false;
        }
      }
      else if (mi[i] === "{") {
        bl++;
        seq = val;
        val = '';
        inseq = true;
        continue;
      }
      else if (escaped) {
        val += mi[i];
        escaped = false;
        continue;
      }
      else if ((i === (mi.length - 1) && sopen === false) || (mi[i] === ";" && pl === 0 && sopen == false)) {
        if (i === (mi.length - 1)) val += mi[i];
        if (val.trim() === "" || val.trim() === "}" || val.trim() === ";") {
          val = "";
          continue;
        }
        ret.push(eztz.utility.ml2tzjson(val));
        val = '';
        continue;
      }
      else if (mi[i] === '"' && sopen) sopen = false;
      else if (mi[i] === '"' && !sopen) sopen = true;
      else if (mi[i] === '\\') escaped = true;
      else if (mi[i] === "(") pl++;
      else if (mi[i] === ")") pl--;
      val += mi[i];
    }
    return ret;
  },
  formatMoney: function (n, c, d, t) {
    var c = isNaN(c = Math.abs(c)) ? 2 : c,
      d = d === undefined ? "." : d,
      t = t === undefined ? "," : t,
      s = n < 0 ? "-" : "",
      i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
      j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
  }
},
//TODO: Add p256 and secp256k1 cryptographay
crypto = {
  extractEncryptedKeys : function(esk, password){
    if (typeof esk == 'undefined') return false;
    if (typeof password == 'undefined') return false;
    if (typeof window.crypto.subtle == 'undefined') return false;
    
    const esb = utility.b58cdecode(esk, prefix.edesk);
    const salt = esb.slice(0, 8);
    const esm = esb.slice(8);
    
    return window.crypto.subtle.importKey('raw', new TextEncoder('utf-8').encode(password), {name: 'PBKDF2'}, false, ['deriveBits']).then(function(key){
        console.log(key);
      return window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 32768,
          hash: {name: 'SHA-512'}
        },
        key,
        256 
      );
    }).then(function(key){
        console.log(key);
        console.log(library.sodium.crypto_secretbox_open_easy(esm, new Uint8Array(24), new Uint8Array(key)));
      const kp = library.sodium.crypto_sign_seed_keypair(library.sodium.crypto_secretbox_open_easy(esm, new Uint8Array(24), new Uint8Array(key)));
      return {
        sk: utility.b58cencode(kp.privateKey, prefix.edsk),
        pk: utility.b58cencode(kp.publicKey, prefix.edpk),
        pkh: utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
      };
    });
  },
  extractKeys : function(sk){
    const pref = sk.substr(0,4);
    switch(pref){
      case "edsk":
        if (sk.length == 98){
          return {
            pk : utility.b58cencode(utility.b58cdecode(sk, prefix.edsk).slice(32), prefix.edpk),
            pkh : utility.b58cencode(library.sodium.crypto_generichash(20, utility.b58cdecode(sk, prefix.edsk).slice(32)), prefix.tz1),
            sk : sk
          };
        } else if (sk.length == 54) { //seed
          const s = utility.b58cdecode(sk, prefix.edsk2);
          const kp = library.sodium.crypto_sign_seed_keypair(s);
          return {
            sk: utility.b58cencode(kp.privateKey, prefix.edsk),
            pk: utility.b58cencode(kp.publicKey, prefix.edpk),
            pkh: utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
          };
        }
      break;
      default:
        return false;
      break;
    }
  },
  generateMnemonic: () => library.bip39.generateMnemonic(160),
  checkAddress: function (a) {
    try {
      utility.b58cdecode(a, prefix.tz1);
      return true;
    }
    catch (e) {
      return false;
    }
  },
  generateKeysNoSeed: function () {
    const kp = library.sodium.crypto_sign_keypair();
    return {
      sk: utility.b58cencode(kp.privateKey, prefix.edsk),
      pk: utility.b58cencode(kp.publicKey, prefix.edpk),
      pkh: utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
    };
  },
  generateKeys: function (m, p) {
    const s = library.bip39.mnemonicToSeed(m, p).slice(0, 32);
    const kp = library.sodium.crypto_sign_seed_keypair(s);
    return {
      mnemonic: m,
      passphrase: p,
      sk: utility.b58cencode(kp.privateKey, prefix.edsk),
      pk: utility.b58cencode(kp.publicKey, prefix.edpk),
      pkh: utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
    };
  },
  generateKeysFromSeedMulti: function (m, p, n) {
    n /= (256 ^ 2);
    const s = library.bip39.mnemonicToSeed(m, library.pbkdf2.pbkdf2Sync(p, n.toString(36).slice(2), 0, 32, 'sha512').toString()).slice(0, 32);
    const kp = library.sodium.crypto_sign_seed_keypair(s);
    return {
      mnemonic: m,
      passphrase: p,
      n: n,
      sk: utility.b58cencode(kp.privateKey, prefix.edsk),
      pk: utility.b58cencode(kp.publicKey, prefix.edpk),
      pkh: utility.b58cencode(library.sodium.crypto_generichash(20, kp.publicKey), prefix.tz1),
    };
  },
  sign: function (bytes, sk, wm) {
    var bb = utility.hex2buf(bytes);
    if (typeof wm != 'undefined') bb = utility.mergebuf(wm, bb);
    const sig = library.sodium.crypto_sign_detached(library.sodium.crypto_generichash(32, bb), utility.b58cdecode(sk, prefix.edsk), 'uint8array');
    const edsig = utility.b58cencode(sig, prefix.edsig);
    const sbytes = bytes + utility.buf2hex(sig);
    return {
      bytes: bytes,
      sig: sig,
      edsig: edsig,
      sbytes: sbytes,
    }
  },
  verify: function (bytes, sig, pk) {
    return library.sodium.crypto_sign_verify_detached(sig, utility.hex2buf(bytes), utility.b58cdecode(pk, prefix.edpk));
  },
};
node = {
  activeProvider: defaultProvider,
  debugMode: false,
  async: true,
	isZeronet : false,
  setDebugMode: function (t) {
    node.debugMode = t;
  },
  setProvider: function (u, z) {
		if (typeof z != 'undefined') node.isZeronet = z;
    node.activeProvider = u;
  },
  resetProvider: function () {
    node.activeProvider = defaultProvider;
  },
  query: function (e, o, t) {
    if (typeof o === 'undefined') {
      if (typeof t === 'undefined') {
        t = "GET";
      } else 
        o = {};
    } else {
      if (typeof t === 'undefined')
        t = 'POST';
    }
    return new Promise(function (resolve, reject) {
      try {
        const http = new XMLHttpRequest();
        http.open(t, node.activeProvider + e, node.async);
        if (node.debugMode)
          console.log(e, o, http.responseText);
        http.onload = function () {
          if (http.status === 200) {
            if (http.responseText) {
              let r = JSON.parse(http.responseText);
              if (typeof r.error !== 'undefined') {
                reject(r.error);
              } else {
                if (typeof r.ok !== 'undefined') r = r.ok;
                resolve(r);
              }
            } else {
              reject("Empty response returned");
            }
          } else {
            if (http.responseText) {
              if (node.debugMode)
                console.log(e, o, http.responseText);
              reject(http.responseText);
            } else {  
              if (node.debugMode)
                console.log(e, o, http.statusText);
              reject(http.statusText);
            }
          }
        };
        http.onerror = function () {
          if (node.debugMode)
            console.log(e, o, http.responseText);
          reject(http.statusText);
        };
        if (t == 'POST'){
          http.setRequestHeader("Content-Type", "application/json");
          http.send(JSON.stringify(o));        
        } else {
          http.send();
        }
      } catch(e) { reject(e)}
    });
  }
},
rpc = {
	call: function (e, d) {
    return node.query(e, d);
  },
  getBalance: function (tz1) {
    return node.query("/chains/main/blocks/head/context/contracts/" + tz1 + "/balance").then(function (r) {
      return r;
    });
  },
  getDelegate: function (tz1) {
    return node.query("/chains/main/blocks/head/context/contracts/" + tz1 + "/delegate").then(function(r){
      if (r) return r;
      return false;
    }).catch(function(){return false});
  },
  getHead: function () {
    return node.query("/chains/main/blocks/head");
  },
  getHeadHash: function () {
    return node.query("/chains/main/blocks/head/hash");
  },
	
	sendOperation: function (from, operation, keys, skipPrevalidation) {
    if (typeof keys == 'undefined') keys = false;
    if (typeof skipPrevalidation == 'undefined') skipPrevalidation = false;
    var hash, counter, pred_block, sopbytes, returnedContracts, opOb;
    var promises = [], requiresReveal=false;

    promises.push(node.query('/chains/main/blocks/head/header'));

    if (Array.isArray(operation)) {
      ops = operation;
    } else {
      ops = [operation];
    }
   
    for(let i = 0; i < ops.length; i++){
      if (['transaction','origination','delegation'].indexOf(ops[i].kind) >= 0){
        requiresReveal = true;
        promises.push(node.query('/chains/main/blocks/head/context/contracts/' + from + '/counter'));
        promises.push(node.query('/chains/main/blocks/head/context/contracts/' + from + '/manager_key'));
        break;
      }
    }

    return Promise.all(promises).then(function (f) {
      head = f[0];
      if (requiresReveal && keys && typeof f[2].key == 'undefined'){
        ops.unshift({
          kind : "reveal",
          fee : (node.isZeronet ? "100000" : "1150"),
          public_key : keys.pk,
          source : from,
					gas_limit: 10000,
					storage_limit: 0
        });
      }
      counter = parseInt(f[1]) + 1;
      if (typeof counters[from] == 'undefined') counters[from] = counter;
			if (counter > counters[from]) counters[from] = counter;
			//fix reset bug temp
			counters[from] = counter;
      for(let i = 0; i < ops.length; i++){
        if (['proposals','ballot','transaction','origination','delegation'].indexOf(ops[i].kind) >= 0){
          if (typeof ops[i].source == 'undefined') ops[i].source = from;
        }
        if (['reveal', 'transaction','origination','delegation'].indexOf(ops[i].kind) >= 0) {
          if (typeof ops[i].gas_limit == 'undefined') ops[i].gas_limit = "0";
          if (typeof ops[i].storage_limit == 'undefined') ops[i].storage_limit = "0";
          ops[i].counter = (counters[from]++).toString();
          
           ops[i].fee = ops[i].fee.toString();
           ops[i].gas_limit = ops[i].gas_limit.toString();
           ops[i].storage_limit = ops[i].storage_limit.toString();
           ops[i].counter = ops[i].counter.toString();
        }
      }
      opOb = {
        "branch": head.hash,
        "contents": ops
      }
      return node.query('/chains/'+head.chain_id+'/blocks/'+head.hash+'/helpers/forge/operations', opOb);
    })
    .then(function (f) {
      var opbytes = f;
      if (keys.sk === false) {
				opOb.protocol = head.protocol;
        return {
          opOb : opOb,
          opbytes : opbytes
        };
      } else {
        if (!keys) {
          sopbytes = opbytes + "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
          opOb.signature = "edsigtXomBKi5CTRf5cjATJWSyaRvhfYNHqSUGrn4SdbYRcGwQrUGjzEfQDTuqHhuA8b2d8NarZjz8TRf65WkpQmo423BtomS8Q";
        } else {
          var signed = crypto.sign(opbytes, keys.sk, watermark.generic);
          sopbytes = signed.sbytes;
          opOb.signature = signed.edsig;
        }
				//return node.query('/chains/main/blocks/head/helpers/scripts/run_operation', opOb)
				
				opOb.protocol = head.protocol;
				if (skipPrevalidation) return rpc.silentInject(sopbytes);
				else return rpc.inject(opOb, sopbytes);
      }
    })
  },
  inject: function(opOb, sopbytes){
    var opResponse = [], errors = [];
    return node.query('/chains/main/blocks/head/helpers/preapply/operations', [opOb]).then(function (f) {
      if (!Array.isArray(f)) throw {error: "RPC Fail", errors:[]};
      for(var i = 0; i < f.length; i++){
        for(var j = 0; j < f[i].contents.length; j++){
          opResponse.push(f[i].contents[j]);
          if (typeof f[i].contents[j].metadata.operation_result != 'undefined' && f[i].contents[j].metadata.operation_result.status == "failed")
            errors = errors.concat(f[i].contents[j].metadata.operation_result.errors);
        }
      }        
      if (errors.length) throw {error: "Operation Failed", errors:errors};
      return node.query('/injection/operation', sopbytes);
    }).then(function (f) {
      return {
        hash : f,
        operations : opResponse
      };
    });
  },
	silentInject: function(sopbytes){
    return node.query('/injection/operation', sopbytes).then(function (f) {
      return {
        hash : f
      };
    });
  },
  
	account: function (keys, amount, spendable, delegatable, delegate, fee, gasLimit, storageLimit) {
		if (typeof gasLimit == 'undefined') gasLimit = '10000';
		if (typeof storageLimit == 'undefined') storageLimit = '300';
    const operation = {
      "kind": "origination",
      "balance": utility.mutez(amount).toString(),
      "fee": fee.toString(),
      "gas_limit": gasLimit,
      "storage_limit": storageLimit,
    };
		if (node.isZeronet) operation['manager_pubkey'] = keys.pkh;
		else operation['managerPubkey'] = keys.pkh;
    if (typeof spendable != "undefined") operation.spendable = spendable;
    if (typeof delegatable != "undefined") operation.delegatable = delegatable;
    if (typeof delegate != "undefined" && delegate) operation.delegate = delegate;
    return rpc.sendOperation(keys.pkh, operation, keys);
  },
	transfer: function (from, keys, to, amount, fee, parameter, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10300';
    if (typeof storageLimit == 'undefined') storageLimit = '277';
    var operation = {
      "kind": "transaction",
      "fee" : fee.toString(),
      "gas_limit": gasLimit,
      "storage_limit": storageLimit,
      "amount": utility.mutez(amount).toString(),
      "destination": to
    };
    if (typeof parameter == 'undefined') parameter = false;
    if (parameter){
      operation.parameters = eztz.utility.sexp2mic(parameter);
    }
    return rpc.sendOperation(from, operation, keys);
  },
  originate: function (keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10000';
    if (typeof storageLimit == 'undefined') storageLimit = '300';
    var _code = utility.ml2mic(code), script = {
      code: _code,
      storage: utility.sexp2mic(init)
    }, operation = {
      "kind": "origination",
      "balance": utility.mutez(amount).toString(),
      "storage_limit": storageLimit,
      "gas_limit": gasLimit,
      "fee" : fee.toString(),
      "script": script,
    };
		if (node.isZeronet) operation['manager_pubkey'] = keys.pkh;
		else operation['managerPubkey'] = keys.pkh;
    if (typeof spendable != "undefined") operation.spendable = spendable;
    if (typeof delegatable != "undefined") operation.delegatable = delegatable;
    if (typeof delegate != "undefined" && delegate) operation.delegate = delegate;
    return rpc.sendOperation(keys.pkh, operation, keys);
  },
  setDelegate(from, keys, delegate, fee, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10000';
    if (typeof storageLimit == 'undefined') storageLimit = '0';
    var operation = {
      "kind": "delegation",
      "fee" : fee.toString(),
      "gas_limit": gasLimit,
      "storage_limit": storageLimit,
      "delegate": (typeof delegate != "undefined" ? delegate : keys.pkh),
    };
    return rpc.sendOperation(from, operation, keys);
  },
  registerDelegate(keys, fee, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10000';
    if (typeof storageLimit == 'undefined') storageLimit = '0';
    var operation = {
      "kind": "delegation",
      "fee" : fee.toString(),
      "gas_limit": gasLimit,
      "storage_limit": storageLimit,
      "delegate": keys.pkh,
    };
    return rpc.sendOperation(keys.pkh, operation, keys);
  },
  
	activate: function (pkh, secret) {
    var operation = {
      "kind": "activate_account",
      "pkh" : pkh,
      "secret": secret,
    };
    return rpc.sendOperation(pkh, operation, false);
  },
  
	typecheckCode(code) {
    var _code = utility.ml2mic(code);
    return node.query("/chains/main/blocks/head/helpers/scripts/typecheck_code", {program : _code, gas : "10000"});
  },
  packData(data, type) {
    var check = {
      data: utility.sexp2mic(data),
      type: utility.sexp2mic(type),
      gas:"400000"
    };
    return node.query("/chains/main/blocks/head/helpers/scripts/pack_data", check);
  },
  typecheckData(data, type) {
    var check = {
      data: utility.sexp2mic(data),
      type: utility.sexp2mic(type),
      gas:"400000"
    };
    return node.query("/chains/main/blocks/head/helpers/scripts/typecheck_data", check);
  },
  runCode(code, amount, input, storage, trace) {
    var ep = ((typeof trace != 'undefined' && trace) ? 'trace_code' : 'run_code');
    return node.query("/chains/main/blocks/head/helpers/scripts/" + ep, {
      script: utility.ml2mic(code),
      amount: utility.mutez(amount).toString(),
      input: utility.sexp2mic(input),
      storage: utility.sexp2mic(storage),
    });
  }
},
contract = {
  hash : function(operationHash, ind){
    var ob = utility.b58cdecode(operationHash, prefix.o), tt = [], i=0;
    for(; i<ob.length; i++){
      tt.push(ob[i]);
    }
    tt = tt.concat([
     (ind & 0xff000000) >> 24,
     (ind & 0x00ff0000) >> 16,
     (ind & 0x0000ff00) >> 8,
     (ind & 0x000000ff)
    ]);
    return utility.b58cencode(library.sodium.crypto_generichash(20, new Uint8Array(tt)), prefix.KT);
  },
  originate: function (keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10000';
    if (typeof storageLimit == 'undefined') storageLimit = '10000';
    return rpc.originate(keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit);
  },
  send: function (contract, from, keys, amount, parameter, fee, gasLimit, storageLimit) {      
    if (typeof gasLimit == 'undefined') gasLimit = '2000';
    if (typeof storageLimit == 'undefined') storageLimit = '0';
    return rpc.transfer(from, keys, contract, amount, fee, parameter, gasLimit, storageLimit);
  },
  balance: function (contract) {
    return rpc.getBalance(contract);
  },
  storage: function (contract) {
    return new Promise(function (resolve, reject) {
      eztz.node.query("/chains/main/blocks/head/context/contracts/" + contract + 
      "/storage").then(function (r) {
        resolve(r);
      }).catch(function (e) {
        reject(e);
      });
    });
  },
  load: function (contract) {
    return eztz.node.query("/chains/main/blocks/head/context/contracts/" + contract);
  },
  watch: function (cc, timeout, cb) {
    let storage = [];
    const ct = function () {
      contract.storage(cc).then(function (r) {
        if (JSON.stringify(storage) != JSON.stringify(r)) {
          storage = r;
          cb(storage);
        }
      });
    };
    ct();
    return setInterval(ct, timeout * 1000);
  },
};
trezor = {
	source : function(address){
		var tag = (address[0] == "t" ? 0 : 1);
		var curve = (parseInt(address[2])-1);
		var pp = (tag == 1 ? prefix.KT : prefix["tz"+(curve+1)]);
		var bytes = utility.b58cdecode(address, pp);
		if (tag == 1) {
			bytes = utility.mergebuf(bytes, [0])
		} else {					
			bytes = utility.mergebuf([curve], bytes)
		}
		return {
			tag : tag,
			hash : bytes
		};
	},
	operation : function(d){
		var operations = [];
		var revealOp = false;
		var op;
		for(var i = 0; i < d.opOb.contents.length; i++){
			op = d.opOb.contents[i];
			if (op.kind == "reveal"){
				if (revealOp) throw "Can't have 2 reveals";
				revealOp = {
					source : trezor.source(op.source),
					fee : parseInt(op.fee),
					counter : parseInt(op.counter),
					gasLimit : parseInt(op.gas_limit),
					storageLimit : parseInt(op.storage_limit),
					publicKey : utility.mergebuf([0], utility.b58cdecode(op.public_key, prefix.edpk)),
				};
			} else {
				if (['origination', 'transaction', 'delegation'].indexOf(op.kind) < 0) return console.log("err2");
				op2 = {
					type : op.kind,
					source : trezor.source(op.source),
					fee : parseInt(op.fee),
					counter : parseInt(op.counter),
					gasLimit : parseInt(op.gas_limit),
					storageLimit : parseInt(op.storage_limit),
				};
				switch(op.kind){
					case "transaction":
						op2.amount = parseInt(op.amount);
						op2.destination = trezor.source(op.destination);
						if (d.opbytes.length > 172) op2.parameters = utility.hex2buf(d.opbytes.substr(172));
					break;
					case "origination":
						if (node.isZeronet) op2.manager_pubkey = trezor.source(op.manager_pubkey).hash;
						else op2.managerPubkey = trezor.source(op.managerPubkey).hash;
						op2.balance = parseInt(op.balance);
						op2.spendable = op.spendable;
						op2.delegatable = op.delegatable;
						if (typeof op.delegate != 'undefined'){
							op2.delegate = trezor.source(op.delegate).hash;
						}
						//Script not supported yet...
					break;
					case "delegation":
						if (typeof op.delegate != 'undefined'){
							op2.delegate = trezor.source(op.delegate).hash;
						}
					break;
				}
				operations.push(op2);
			}
		}
		if (operations.length > 1) return console.log("Too many operations");
		var operation = operations[0];
		var tx = {};
		return [operation, revealOp];
	}
};

//Legacy
utility.ml2tzjson = utility.sexp2mic;
utility.tzjson2arr = utility.mic2arr;
utility.mlraw2json = utility.ml2mic;
utility.mintotz = utility.totez;
utility.tztomin = utility.mutez;
prefix.TZ = new Uint8Array([2,90,121]);

//Expose library
eztz = {
  library: library,
  prefix: prefix,
  watermark: watermark,
  utility: utility,
  crypto: crypto,
  node: node,
  rpc: rpc,
  contract: contract,
  trezor: trezor,
};

module.exports = {
  defaultProvider,
  eztz: eztz,
};
