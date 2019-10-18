if (typeof Buffer == "undefined") Buffer = require("buffer/").Buffer;
if (typeof XMLHttpRequest == "undefined") XMLHttpRequest = require('xhr2');
const BN = require("bignumber.js");
const 
//CLI below
defaultProtocol = "PsBabyM1eUXZseaJdmXFApDSBqj8YBfwELoxZHHW77EMcAbbwAS",
defaultProvider = "https://mainnet.tezrpc.me/",
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
	b582int : function(v){
		var rv = new BN(0), alpha = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
		for(var i = 0; i < v.length; i++){
			rv = rv.plus(
				new BN(alpha.indexOf(v[v.length-1-i])).multipliedBy(
					new BN(alpha.length).exponentiatedBy(i)));
		}
		return rv.toString(16);
	},
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
          } else if (val[0] == '0' && val[1] == 'x') {
						val = val.substr(2);
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
  setProtocol : function(p){
    node.currentProtocol = p;
  },
  resetProtocol: function () {
    node.currentProtocol = defaultProtocol;
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
          console.log("Node call", e, o);
        http.onload = function () {
          if (http.status === 200) {
            if (http.responseText) {
              let r;
              if (http.responseText.trim() == "null") {
                r = false;
              } else {
                r = JSON.parse(http.responseText);
              }
							if (node.debugMode) console.log("Node response", e, o, r);
              if (r && typeof r.error !== 'undefined') {
                reject(r.error);
              } else {
                if (r && typeof r.ok !== 'undefined') r = r.ok;
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
  getBalance: function (a) {
    return node.query("/chains/main/blocks/head/context/contracts/" + a + "/balance").then(function (r) {
      return r;
    });
  },
  getDelegate: function (a) {
    return node.query("/chains/main/blocks/head/context/contracts/" + a + "/delegate").then(function(r){
      if (r) return r;
      return false;
    }).catch(function(){return false});
  },
  getManager : function(a){
		 return node.query("/chains/main/blocks/head/context/contracts/" + a + "/manager_key");
	},
	getCounter : function(a){
		 return node.query("/chains/main/blocks/head/context/contracts/" + a + "/counter");
	},
	getBaker : function(tz1){
		 return node.query("/chains/main/blocks/head/context/delegates/" + tz1);
	},
	getHead: function () {
    return node.query("/chains/main/blocks/head");
  },
	getHeader: function () {
    return node.query("/chains/main/blocks/head/header");
  },
  getHeadHash: function () {
    return node.query("/chains/main/blocks/head/hash");
  },
	
	getBallotList: function(){
		return node.query("/chains/main/blocks/head/votes/ballot_list");
	},
	getProposals: function(){
		return node.query("/chains/main/blocks/head/votes/proposals ");
	},
	getBallots: function(){
		return node.query("/chains/main/blocks/head/votes/ballots ");
	},
	getListings: function(){
		return node.query("/chains/main/blocks/head/votes/listings ");
	},
	getCurrentProposal: function(){
		return node.query("/chains/main/blocks/head/votes/current_proposal ");
	},
	getCurrentPeriod: function(){
		return node.query("/chains/main/blocks/head/votes/current_period_kind ");
	},
	getCurrentQuorum: function(){
		return node.query("/chains/main/blocks/head/votes/current_quorum ");
	},
	
	awaitOperation : function(hash, interval, timeout){
		if (typeof interval == 'undefined') '30';
		if (typeof timeout == 'undefined') '180';
		if (timeout <= 0) throw "Timeout must be more than 0";
		if (interval <= 0) throw "Interval must be more than 0";
		var at = Math.ceil(timeout/interval) + 1, c = 0;;
		return new Promise(function(resolve, reject){
			var repeater = function(){
				rpc.getHead().then(function(h){
					c++;
					outer:
					for(var i = 3, found = false; i >= 0; i--){
						for(var j = 0; j < h.operations[i].length; j++){
							if (h.operations[i][j].hash == hash){
								found = true;
								break outer;
							}
						}
					}
					if (found) resolve(h.hash)
					else {
						if (c >= at) {
							reject("Timeout");
						} else {
							setTimeout(repeater, interval);
						}
					}
				});
			}
			repeater();
		});
	},
	prepareOperation : function(from, operation, keys, revealFee){
		if (typeof keys == 'undefined') keys = false;
		if (typeof revealFee == 'undefined') revealFee = "1269";
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
        promises.push(rpc.getCounter(keys.pkh));
        promises.push(rpc.getManager(keys.pkh));
        break;
      }
    }
    return Promise.all(promises).then(function (f) {
      head = f[0];
      if (requiresReveal && keys && typeof f[2].key == 'undefined'){
        ops.unshift({
          kind : "reveal",
          fee : revealFee,
          public_key : keys.pk,
          source : keys.pkh,
          gas_limit: 10000,
          storage_limit: 0
        });
      }
      counter = parseInt(f[1]) + 1;
      if (typeof counters[keys.pkh] == 'undefined') counters[keys.pkh] = counter;
			if (counter > counters[keys.pkh]) counters[keys.pkh] = counter;
			//fix reset bug temp
			counters[keys.pkh] = counter;
      for(let i = 0; i < ops.length; i++){
        if (['proposals','ballot','transaction','origination','delegation'].indexOf(ops[i].kind) >= 0){
          if (typeof ops[i].source == 'undefined') ops[i].source = keys.pkh;
        }
        if (['reveal', 'transaction','origination','delegation'].indexOf(ops[i].kind) >= 0) {
          if (typeof ops[i].gas_limit == 'undefined') ops[i].gas_limit = "0";
          if (typeof ops[i].storage_limit == 'undefined') ops[i].storage_limit = "0";
          ops[i].counter = (counters[keys.pkh]++).toString();
          
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
      return tezos.forge(head, opOb);
    })
	},
	simulateOperation : function(from, operation, keys){
		return rpc.prepareOperation(from, operation, keys).then(function(fullOp){
			return node.query('/chains/main/blocks/head/helpers/scripts/run_operation', fullOp.opOb);
		});
	},
	sendOperation: function (from, operation, keys, skipPrevalidation, revealFee) {
    if (typeof revealFee == 'undefined') revealFee = '1269';
    if (typeof skipPrevalidation == 'undefined') skipPrevalidation = false;
    return rpc.prepareOperation(from, operation, keys, revealFee).then(function (fullOp) {
      if (keys.sk === false) {
        return fullOp;
      } else {
        if (!keys) {
          fullOp.opbytes += "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
          fullOp.opOb.signature = "edsigtXomBKi5CTRf5cjATJWSyaRvhfYNHqSUGrn4SdbYRcGwQrUGjzEfQDTuqHhuA8b2d8NarZjz8TRf65WkpQmo423BtomS8Q";
        } else {
          var signed = crypto.sign(fullOp.opbytes, keys.sk, watermark.generic);
          fullOp.opbytes = signed.sbytes;
          fullOp.opOb.signature = signed.edsig;
        }
				if (skipPrevalidation) return rpc.silentInject(fullOp.opbytes);
				else return rpc.inject(fullOp.opOb, fullOp.opbytes);
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
      return node.query('/injection/operation', sopbytes).then(function(r){
        return r;
      }).catch(function(e){
        throw e;
      });
    }).then(function (f) {
      return {
        hash : f,
        operations : opResponse
      };
    }).catch(function(e){
      console.error("Validation error", e);
      throw e;
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
		if (typeof storageLimit == 'undefined') storageLimit = '257';
    const operation = {
      "kind": "origination",
      "balance": utility.mutez(amount).toString(),
      "fee": fee.toString(),
      "gas_limit": gasLimit,
      "storage_limit": storageLimit,
    };
		operation['manager_pubkey'] = keys.pkh;
    if (typeof spendable != "undefined") operation.spendable = spendable;
    if (typeof delegatable != "undefined") operation.delegatable = delegatable;
    if (typeof delegate != "undefined" && delegate) operation.delegate = delegate;
    return rpc.sendOperation(keys.pkh, operation, keys);
  },
	transfer: function (from, keys, to, amount, fee, parameter, gasLimit, storageLimit, revealFee) {
    if (typeof revealFee == 'undefined') revealFee = '1269';
    if (typeof gasLimit == 'undefined') gasLimit = '10200';
    if (typeof storageLimit == 'undefined') storageLimit = '300';
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
    return rpc.sendOperation(from, operation, keys, false, revealFee);
  },
  originate: function (keys, amount, code, init, spendable, delegatable, delegate, fee, gasLimit, storageLimit) {
    if (typeof gasLimit == 'undefined') gasLimit = '10000';
    if (typeof storageLimit == 'undefined') storageLimit = '257';
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
		operation['manager_pubkey'] = keys.pkh;
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
    };
    if (typeof delegate != "undefined" && delegate) {
      operation.delegate = delegate;
    }
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
tezos = {
  forge : function(head, opOb, validateLocalForge){
    if (typeof validateLocalForge == 'undefined') validateLocalForge = true;
		
    return node.query('/chains/'+head.chain_id+'/blocks/'+head.hash+'/helpers/forge/operations', opOb).then(function(remoteForgedBytes){
      var localForgedBytes;
      localForgedBytes = utility.buf2hex(utility.b58cdecode(opOb.branch, prefix.b));
      for(var i = 0; i < opOb.contents.length; i++){
        localForgedBytes += forgeOp(opOb.contents[i]);
      }
      
      opOb.protocol = head.protocol;
      if (localForgedBytes == remoteForgedBytes) {
        return {
          opbytes : localForgedBytes,
          opOb : opOb
        };
      } else {
        throw "Forge validation error - local and remote bytes don't match";
      }
    })
  },
  encodeRawBytes : function (input){
      const rec = function(input){
        const result = [];

        if (input instanceof Array) {
          result.push('02')
          const bytes = input.map(function(x){ return rec(x)}).join('');
          const len = bytes.length / 2;
          result.push(len.toString(16).padStart(8, '0'));
          result.push(bytes);

        } else if (input instanceof Object) {
          if (input.prim) {
            const args_len = input.args ? input.args.length : 0
            result.push(prim_mapping_reverse[args_len][!!input.annots])
            result.push(op_mapping_reverse[input.prim])
            if (input.args) {
              input.args.forEach(function(arg){
                return result.push(rec(arg));
              });
            }

            if (input.annots) {
              const annots_bytes = input.annots.map(function(x){
                return utility.buf2hex(new TextEncoder().encode(x))
              }).join('20');
              result.push((annots_bytes.length / 2).toString(16).padStart(8, '0'));
              result.push(annots_bytes);
            }

          } else if (input.bytes) {

            const len = input.bytes.length / 2;
            result.push('0A');
            result.push(len.toString(16).padStart(8, '0'));
            result.push(input.bytes);

          } else if (input.int) {
            const num = new BN(input.int, 10);
            const positive_mark = num.toString(2)[0] === '-' ? '1' : '0';
            const binary = num.toString(2).replace('-', '');
            const pad = binary.length <= 6 ? 6 : ((binary.length - 6) % 7 ? binary.length + 7 - (binary.length - 6) % 7 : binary.length);
            
            const splitted = binary.padStart(pad, '0').match(/\d{6,7}/g);
            const reversed = splitted.reverse();

            reversed[0] = positive_mark + reversed[0];
            const num_hex = reversed.map(function(x, i){ 
              return parseInt((i === reversed.length - 1 ? '0' : '1') + x, 2)
              .toString(16)
              .padStart(2, '0')
            }).join('')

            result.push('00')
            result.push(num_hex)

          } else if (input.string) {

            const string_bytes = new TextEncoder().encode(input.string)
            const string_hex = [].slice.call(string_bytes).map(function(x){
              return x.toString(16).padStart(2, '0')
            }).join('');
            const len = string_bytes.length;
            result.push('01');
            result.push(len.toString(16).padStart(8, '0'));
            result.push(string_hex);
          }
        }
        return result.join('')
      }

      return rec(input).toUpperCase()
  },
  decodeRawBytes : function (bytes) {
    bytes = bytes.toUpperCase()
    
    let index = 0

    const read = function(len) { return bytes.slice(index, index + len) };

    const rec = function(){
      const b = read(2)
      const prim = prim_mapping[b]
      
      if (prim instanceof Object) {

        index += 2
        const op = op_mapping[read(2)]
        index += 2

        const args = Array.apply(null, new Array(prim.len))
        const result = {prim: op, args: args.map(function(){ return rec()}), annots: undefined}

        if (!prim.len)
          delete result.args

        if (prim.annots) {
          const annots_len = parseInt(read(8), 16) * 2
          index += 8

          const string_hex_lst = read(annots_len).match(/[\dA-F]{2}/g)
          index += annots_len
          
          if (string_hex_lst) {
            const string_bytes = new Uint8Array(string_hex_lst.map(function(x) { return parseInt(x, 16)}))
            const string_result = new TextDecoder('utf-8').decode(string_bytes)
            result.annots = string_result.split(' ')
          }
        } else {
          delete result.annots
        }

        return result

      } else {
        if (b === '0A') {

          index += 2
          const len = read(8)
          index += 8
          const int_len = parseInt(len, 16) * 2
          const data = read(int_len)
          index += int_len
          return {bytes: data}

        } else if (b === '01') {
          index += 2
          const len = read(8)
          index += 8
          const int_len = parseInt(len, 16) * 2
          const data = read(int_len)
          index += int_len

          const match_result = data.match(/[\dA-F]{2}/g)
          if (match_result instanceof Array) {
            const string_raw = new Uint8Array(match_result.map(function(x){ return parseInt(x, 16)}))
            return {string: new TextDecoder('utf-8').decode(string_raw)}
          } else {
            throw 'Input bytes error'
          }

        } else if (b === '00') {
          index += 2

          const first_bytes = parseInt(read(2), 16).toString(2).padStart(8, '0')
          index += 2
          const is_positive = first_bytes[1] === '0'

          const valid_bytes = [first_bytes.slice(2)]

          let checknext = first_bytes[0] === '1'
          while (checknext) {
            const bytes = parseInt(read(2), 16).toString(2).padStart(8, '0')
            index += 2

            valid_bytes.push(bytes.slice(1))
            checknext = bytes[0] === '1'
          }

          const num = new BN(valid_bytes.reverse().join(''), 2)
          return {int: num.toString()}
        } else if (b === '02') {
          index += 2

          const len = read(8)
          index += 8
          const int_len = parseInt(len, 16) * 2
          const data = read(int_len)
          const limit = index + int_len

          const seq_lst = []
          while (limit > index) {
            seq_lst.push(rec())
          }
          return seq_lst
        }

      }

      throw `Invalid raw bytes: Byte:${b} Index:${index}`
    }

    return rec()
  }
},
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
  parameter : function(address, opbytes){
		var tag = (address[0] == "t" ? 0 : 1);
		var curve = (parseInt(address[2])-1);
		var pp = (tag == 1 ? prefix.KT : prefix["tz"+(curve+1)]);
		var bytes = utility.b58cdecode(address, pp);
		if (tag == 1) {
			bytes = utility.mergebuf(bytes, [0])
		} else {					
			bytes = utility.mergebuf([curve], bytes)
		}
    hex = utility.buf2hex(utility.mergebuf([tag], bytes));
    return (opbytes.substr(-46) == hex + "00" ? false : utility.hex2buf(opbytes.substr(opbytes.indexOf(hex)+hex.length+2)));
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
            if (p = trezor.parameter(op.destination, d.opbytes)) op2.parameters = p;
					break;
					case "origination":
						op2.manager_pubkey = trezor.source(op.manager_pubkey).hash;
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


//Forge functions
var op_mapping = {
  '00':'parameter',
  '01':'storage',
  '02':'code',
  '03':'False',
  '04':'Elt',
  '05':'Left',
  '06':'None',
  '07':'Pair',
  '08':'Right',
  '09':'Some',
  '0A':'True',
  '0B':'Unit',
  '0C':'PACK',
  '0D':'UNPACK',
  '0E':'BLAKE2B',
  '0F':'SHA256',
  '10':'SHA512',
  '11':'ABS',
  '12':'ADD',
  '13':'AMOUNT',
  '14':'AND',
  '15':'BALANCE',
  '16':'CAR',
  '17':'CDR',
  '18':'CHECK_SIGNATURE',
  '19':'COMPARE',
  '1A':'CONCAT',
  '1B':'CONS',
  '1C':'CREATE_ACCOUNT',
  '1D':'CREATE_CONTRACT',
  '1E':'IMPLICIT_ACCOUNT',
  '1F':'DIP',
  '20':'DROP',
  '21':'DUP',
  '22':'EDIV',
  '23':'EMPTY_MAP',
  '24':'EMPTY_SET',
  '25':'EQ',
  '26':'EXEC',
  '27':'FAILWITH',
  '28':'GE',
  '29':'GET',
  '2A':'GT',
  '2B':'HASH_KEY',
  '2C':'IF',
  '2D':'IF_CONS',
  '2E':'IF_LEFT',
  '2F':'IF_NONE',
  '30':'INT',
  '31':'LAMBDA',
  '32':'LE',
  '33':'LEFT',
  '34':'LOOP',
  '35':'LSL',
  '36':'LSR',
  '37':'LT',
  '38':'MAP',
  '39':'MEM',
  '3A':'MUL',
  '3B':'NEG',
  '3C':'NEQ',
  '3D':'NIL',
  '3E':'NONE',
  '3F':'NOT',
  '40':'NOW',
  '41':'OR',
  '42':'PAIR',
  '43':'PUSH',
  '44':'RIGHT',
  '45':'SIZE',
  '46':'SOME',
  '47':'SOURCE',
  '48':'SENDER',
  '49':'SELF',
  '4A':'STEPS_TO_QUOTA',
  '4B':'SUB',
  '4C':'SWAP',
  '4D':'TRANSFER_TOKENS',
  '4E':'SET_DELEGATE',
  '4F':'UNIT',
  '50':'UPDATE',
  '51':'XOR',
  '52':'ITER',
  '53':'LOOP_LEFT',
  '54':'ADDRESS',
  '55':'CONTRACT',
  '56':'ISNAT',
  '57':'CAST',
  '58':'RENAME',
  '59':'bool',
  '5A':'contract',
  '5B':'int',
  '5C':'key',
  '5D':'key_hash',
  '5E':'lambda',
  '5F':'list',
  '60':'map',
  '61':'big_map',
  '62':'nat',
  '63':'option',
  '64':'or',
  '65':'pair',
  '66':'set',
  '67':'signature',
  '68':'string',
  '69':'bytes',
  '6A':'mutez',
  '6B':'timestamp',
  '6C':'unit',
  '6D':'operation',
  '6E':'address',
  '6F':'SLICE',
}
var op_mapping_reverse = (function(){
  var result = {}
  for (const key in op_mapping) {
    result[op_mapping[key]] = key
  }
  return result
})()

var prim_mapping = {
  '00': 'int',    
  '01': 'string',             
  '02': 'seq',             
  '03': {name: 'prim', len: 0, annots: false},          
  '04': {name: 'prim', len: 0, annots: true},
  '05': {name: 'prim', len: 1, annots: false},           
  '06': {name: 'prim', len: 1, annots: true},   
  '07': {name: 'prim', len: 2, annots: false},          
  '08': {name: 'prim', len: 2, annots: true},  
  '09': {name: 'prim', len: 3, annots: true},
  '0A': 'bytes'                  
}
var prim_mapping_reverse = {
  [0]: {
    false: '03',
    true: '04'
  },
  [1]: {
    false: '05',
    true: '06'
  },
  [2]: {
    false: '07',
    true: '08'
  },
  [3]: {
    true: '09'
  }
}
function forgeOp(op){
  var forgeOpTags = {
    "endorsement" : 0,
    "seed_nonce_revelation" : 1,
    "double_endorsement_evidence" : 2,
    "double_baking_evidence" : 3,
    "activate_account" : 4,
    "proposals" : 5,
    "ballot" : 6,
    "reveal" : 7,
    "transaction" : 8,
    "origination" : 9,
    "delegation" : 10,
  };
  if (currentProtocol == 'PsBabyM1eUXZseaJdmXFApDSBqj8YBfwELoxZHHW77EMcAbbwAS'){
    forgeOpTags.reveal = 107;
    forgeOpTags.transaction = 108;
    forgeOpTags.origination = 109;
    forgeOpTags.delegation = 110;
  }
  var fop;
  fop = eztz.utility.buf2hex(new Uint8Array([forgeOpTags[op.kind]]));
  switch (forgeOpTags[op.kind]) {
    case 0: 
    case 1: 
      fop += eztz.utility.buf2hex(toBytesInt32(op.level));
      if (forgeOpTags[op.kind] == 0) break;
      fop += op.nonce;
      if (forgeOpTags[op.kind] == 1) break;
    case 2:
    case 3:
      throw "Double bake and double endorse forging is not complete";
      if (forgeOpTags[op.kind] == 2) break;
      if (forgeOpTags[op.kind] == 3) break;
    case 4:
      fop += eztz.utility.buf2hex(eztz.utility.b58cdecode(op.pkh, eztz.prefix.tz1));
      fop += op.secret;
      if (forgeOpTags[op.kind] == 4) break;
    case 5: 
    case 6: 
      fop += forgePublicKeyHash(op.source);
      fop += eztz.utility.buf2hex(toBytesInt32(op.period));
      if (forgeOpTags[op.kind] == 5) {
        throw "Proposal forging is not complete";
        break;
      } else if (forgeOpTags[op.kind] == 6) {
        fop += eztz.utility.buf2hex(eztz.utility.b58cdecode(op.proposal, eztz.prefix.P));
        fop += (op.ballot == "yay" ? "00" : (op.ballot == "nay" ? "01" : "02"));
        break;
      }
    case 7: 
    case 8: 
    case 9: 
    case 10: 
      fop += forgeAddress(op.source);
      fop += forgeZarith(op.fee);
      fop += forgeZarith(op.counter);
      fop += forgeZarith(op.gas_limit);
      fop += forgeZarith(op.storage_limit);
      if (forgeOpTags[op.kind] == 7) {
        fop += forgePublicKey(op.public_key);
      } else if (forgeOpTags[op.kind] == 8) {
        fop += forgeZarith(op.amount);
        fop += forgeAddress(op.destination);
        if (typeof op.parameters != 'undefined' && op.parameters) {
          fop += forgeBool(true);
          fop += forgeParameters(op.parameters);
        } else {
          fop += forgeBool(false);
        }
      } else if (forgeOpTags[op.kind] == 9) {
        fop += forgePublicKeyHash(op.manager_pubkey);
        fop += forgeZarith(op.balance);
        fop += forgeBool(op.spendable);
        fop += forgeBool(op.delegatable);
        if (typeof op.delegate != 'undefined' && op.delegate){
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
        if (typeof op.script != 'undefined' && op.script){
          fop += forgeBool(true);
          fop += forgeScript(op.script);
        } else {
          fop += forgeBool(false);
        }
      } else if (forgeOpTags[op.kind] == 10) {
        if (typeof op.delegate != 'undefined' && op.delegate){
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
      }
    break;
    case 107: 
    case 108: 
    case 109: 
    case 110: 
      fop += forgePublicKeyHash(op.source);
      fop += forgeZarith(op.fee);
      fop += forgeZarith(op.counter);
      fop += forgeZarith(op.gas_limit);
      fop += forgeZarith(op.storage_limit);
      if (forgeOpTags[op.kind] == 107) {
        fop += forgePublicKey(op.public_key);
      } else if (forgeOpTags[op.kind] == 108) {
        fop += forgeZarith(op.amount);
        fop += forgeAddress(op.destination);
        if (typeof op.parameters != 'undefined' && op.parameters) {
          fop += forgeBool(true);
          fop += forgeParameters(op.parameters);
        } else {
          fop += forgeBool(false);
        }
      } else if (forgeOpTags[op.kind] == 109) {
        fop += forgeZarith(op.balance);
        if (typeof op.delegate != 'undefined' && op.delegate){
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
        fop += forgeBool(true);
        fop += forgeScript(op.script);
      } else if (forgeOpTags[op.kind] == 110) {
        if (typeof op.delegate != 'undefined' && op.delegate){
          fop += forgeBool(true);
          fop += forgePublicKeyHash(op.delegate);
        } else {
          fop += forgeBool(false);
        }
      }
    break;
  }
  return fop;
}
function forgeBool(b){
  return (b ? "ff" : "00");
}
function forgeScript(s){
  var t1 = tezos.encodeRawBytes(s.code).toLowerCase();
  var t2 = tezos.encodeRawBytes(s.storage).toLowerCase();
  return toBytesInt32Hex(t1.length/2) + t1 + toBytesInt32Hex(t2.length/2) + t2;
}
function forgeParameters(p){
  var entrypoints = {
    'default' : "00",
    'root' : "01",
    'do' : "02",
    'set_delegate' : "03",
    'remove_delegate' : "04",
  };
 if (typeof entrypoints[p.entrypoint] == 'undefined') throw "Unknown entrypoint " + p.entrypoint;
  var fp = entrypoints[p.entrypoint];
  var t = tezos.encodeRawBytes(p.value).toLowerCase();
  return fp + toBytesInt32Hex(t.length/2) + t;
}
function forgeAddress(a){
  var fa;
  if (a.substr(0, 1) == "K"){
    fa = "01";
    fa += eztz.utility.buf2hex(eztz.utility.b58cdecode(a, eztz.prefix.KT));
    fa += "00";
  } else {
    fa = "00";
    fa += forgePublicKeyHash(a);
  }
  return fa;
}
function forgeZarith(n){
  var fn = '';
  n = parseInt(n);
  while(true){
    if (n < 128){
      if (n < 16) fn += "0";
      fn += n.toString(16);
      break;
    } else {
      var b = (n % 128);
      n -= b;
      n /= 128;
      b += 128;
      fn += b.toString(16);
    }
  }
  return fn;
}
function forgePublicKeyHash(pkh){
  var fpkh;
  var t = parseInt(pkh.substr(2, 1));
  fpkh = "0" + (t - 1).toString();
  fpkh += eztz.utility.buf2hex(eztz.utility.b58cdecode(pkh, eztz.prefix[pkh.substr(0,3)]));
  return fpkh;
}
function forgePublicKey(pk){
  var fpk;
  var t;
  switch(pk.substr(0,2)){
    case "ed": fpk = "00"; break;
    case "sp": fpk = "01"; break;
    case "p2": fpk = "02"; break;
  }
  fpk += eztz.utility.buf2hex(eztz.utility.b58cdecode(pk, eztz.prefix[pk.substr(0,4)]));
  return fpk;
}
function toBytesInt32 (num) {
  num = parseInt(num);
  arr = new Uint8Array([
   (num & 0xff000000) >> 24,
   (num & 0x00ff0000) >> 16,
   (num & 0x0000ff00) >> 8,
   (num & 0x000000ff)
  ]);
  return arr.buffer;
}
function toBytesInt32Hex (num) {
  return utility.buf2hex(toBytesInt32(num));
}


//Proto switcher
var currentProtocol = defaultProtocol;
var protocolDefinitions = {};
protocolDefinitions['default'] = {
  "library" : library,
  "prefix" : prefix,
  "watermark" : watermark,
  "utility" : utility,
  "crypto" : crypto,
  "node" : node,
  "rpc" : rpc,
  "contract" : contract,
  "trezor" : trezor,
  "tezos" : tezos,
};
protocolDefinitions['PtCJ7pwo'] = protocolDefinitions['default'];
protocolDefinitions['ProtoALp'] = protocolDefinitions['PtCJ7pwo'];
protocolDefinitions['PsYLVpVv'] = protocolDefinitions['ProtoALp'];
protocolDefinitions['PsddFKi3'] = protocolDefinitions['PsYLVpVv'];
protocolDefinitions['Pt24m4xi'] = protocolDefinitions['PsddFKi3'];
protocolDefinitions['PsBabyM1'] = protocolDefinitions['Pt24m4xi'];
protocolDefinitions['PsBabyM1'].rpc.prepareOperation = function(from, operation, keys, revealFee){
  if (typeof keys == 'undefined') keys = false;
  if (typeof revealFee == 'undefined') revealFee = "1269";
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
      promises.push(rpc.getCounter(from));
      promises.push(rpc.getManager(from));
      break;
    }
  }
  return Promise.all(promises).then(function (f) {
    head = f[0];
    if (requiresReveal && keys && f[2] === false){
      ops.unshift({
        kind : "reveal",
        fee : revealFee,
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
    return tezos.forge(head, opOb);
  })
}
protocolDefinitions['PsBabyM1'].rpc.transfer = function (from, keys, to, amount, fee, parameter, gasLimit, storageLimit, revealFee, entrypoint) {
  if (typeof revealFee == 'undefined') revealFee = '1269';
  if (typeof gasLimit == 'undefined') gasLimit = '10200';
  if (typeof storageLimit == 'undefined') storageLimit = '300';
  // if (typeof parameter == 'undefined') parameter = ['default', 'Unit'];
  // if (!parameter) parameter = ['default', 'Unit'];
  // console.log(parameter);
  var operation = {
    "kind": "transaction",
    "fee" : fee.toString(),
    "gas_limit": gasLimit,
    "storage_limit": storageLimit,
    "amount": utility.mutez(amount).toString(),
    "destination": to
  };
  if (parameter){
    if (typeof parameter != "object") parameter = ['default', parameter];
    if (typeof parameter[1] == 'string') parameter[1] = eztz.utility.sexp2mic(parameter[1]);
    operation['parameters'] = {
      "entrypoint" : parameter[0],
      "value" : parameter[1]
    }
  }
  return rpc.sendOperation(from, operation, keys, false, revealFee);
}


function proto(p, lib){
  var pp = p.substr(0,8);
  if (typeof protocolDefinitions[pp] == 'undefined'){
    throw "Unknown protocol";
  }
  return protocolDefinitions[pp][lib];
}
//Legacy
utility.ml2tzjson = utility.sexp2mic;
utility.tzjson2arr = utility.mic2arr;
utility.mlraw2json = utility.ml2mic;
utility.mintotz = utility.totez;
utility.tztomin = utility.mutez;

//Expose library
eztz = {
  setProtocol : function(p){
    if (typeof p != 'undefined') {
      currentProtocol = p;
      return true;
    } else {
      return rpc.getHeader().then(function(r){
        currentProtocol = r.protocol;
        return currentProtocol;
      });
    }
  },
  getProtocol : function(){
    return currentProtocol;
  },
  resetProtocol : function(){
    currentProtocol = defaultProtocol;
    return currentProtocol;
  },
  library : proto(currentProtocol, 'library'),
  prefix : proto(currentProtocol, 'prefix'),
  watermark : proto(currentProtocol, 'watermark'),
  utility : proto(currentProtocol, 'utility'),
  crypto : proto(currentProtocol, 'crypto'),
  node : proto(currentProtocol, 'node'),
  rpc : proto(currentProtocol, 'rpc'),
  contract : proto(currentProtocol, 'contract'),
  trezor : proto(currentProtocol, 'trezor'),
  tezos : proto(currentProtocol, 'tezos'),
  proto : proto,
};

module.exports = {
  defaultProvider,
  defaultProtocol,
  eztz: eztz,
};
