# eztz
Easy Tezos key generator, operation signing and utility tool - It's eztz! Live demo: http://173.254.236.122/keygen.html

#### *** Disclaimer - all keys generated should be treated as live. Please use the tool offline, and endavour to keep any input/output data secure and private ***

### Installation
In browser, just include eztz.js and you're good to go.

### Building
Rebuild bundle using the following code (requires browserify):
##### browserify main.js -o eztz.js

### Usage
Include the eztz.js file and run the eztz_ready function as per below:
```html
<script src="./eztz.js"></script>
<script>
    var m = eztz.generateMnemonic();
    var keys = eztz.generateKeys(m, 'test');
    console.log(keys);
</script>
```
### Available Functions

#### eztz.prefix
Object consisting of prefixes (base58check) used for Secret key, Public key, Public key hash
```javascript
{
    tz1:tz1, // Public Key Hash
    edsk:edsk, // Secret Key 
    edpk:edpk // Public Key 
}
```

#### eztz.encode58(decoded, prefix)
Returns a base58check encoded string using the prefix provided

#### eztz.decode(encoded, prefix)
Decodes an encoded base58check string with set prefix

#### eztz.setRpcUrl(url)
Set the URL of a node to use with the Tezos RPC api. By default, this uses the tezrpc.me server.

#### eztz.generateKeysNoSeed()
Returns an object with generated keys and associated data in a non-dertministic way
```javascript
{
    sk : sk, // The secret/private key hash (sk - starts with edsk)
    pk : pk, // The public key hash (pk - starts with edpk)
    pkh : pkh, // The public key hash (pkh or id - starts with tz1)
}
```
#### eztz.generateMnemonic()
Returns a mnemonic to be used for the key generator (string)

#### eztz.generateKeys(mnemonic, passphrase)
Returns an object with generated keys and associated data in a deterministic way
```javascript
{
    mnemonic : mnemonic, // The mneomic used
    passphrase : passphrase, // The passphrase used
    sk : sk, // The secret/private key hash (sk - starts with edsk)
    pk : pk, // The public key hash (pk - starts with edpk)
    pkh : pkh, // The public key hash (pkh or id - starts with tz1)
}
```

#### eztz.generateKeysFromSeedMulti(mnemonic, passphrase, n)
Returns an object with generated keys and associated data in a deterministic way, where n can be used to produce multiple addresses with a single mnemonic/passphrase pair.
```javascript
{
    mnemonic : mnemonic, // The mneomic used
    passphrase : passphrase, // The passphrase used
    n : n, // The index used
    sk : sk, // The secret/private key hash (sk - starts with edsk)
    pk : pk, // The public key hash (pk - starts with edpk)
    pkh : pkh, // The public key hash (pkh or id - starts with tz1)
}
```

#### eztz.sendOperation(operation, keys, fee, returnFn)
Returns an object with generated keys and associated data in a non-dertministic way (WIP)
```javascript
// Operations are based on the Tezos standard
var operation = {
  "kind": "transaction",
  "amount": 100, // This is in centiles, i.e. 100 = 1.00 tez
  "destination": "tz1NhhF1S6qhhEepykUyFmpvd6wBuTAbmToD"
};
//Keys is a key object returned from one of the above keygen methods - must include sk/pk/pkh
eztz.sendOperation(operation, keys, 0, function(r){
    // Returns direct result from node - r.errors will exist on failure
    console.log(r)
});
```

### Future Development
We will be working on this library on a regular basis, with hopes of adding more functiliaty (message signing/verification etc).

### Credits
Stephen Andrews

### Support Us
Please consider donating to help us develop this, and other Tezos related tools
Bitcoin: 1KSiyfgs5XwTZjaLpmCTHxonsyXMx383P1

### Credits
https://github.com/bitcoinjs/bs58check (for base58check encode/decode)
https://github.com/jedisct1/libsodium.js (for all crypto related functions)
https://github.com/bitcoinjs/bip39 (for mnemonic code)
https://github.com/crypto-browserify/pbkdf2 (for passphrase hashing)
https://github.com/feross/buffer (for browser buffer)

##### Shout out to Tezzigator for helping me with the operation signing functionality.

### License
MIT
