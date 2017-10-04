# eztz
Easy Tezos key generator and utility tool - It's eztz! Live demo: http://173.254.236.122/keygen.html

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
    /* eztz is now ready to use */
    eztz_ready(function(eztz){
        var m = eztz.generateMnemonic();
        var keys = eztz.generateKeys(m, 'test');
        console.log(keys);
    });
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

### Future Development
We will be working on this library on a regular basis, with hopes of adding more functiliaty (message signing/verification etc).

### Support Us
Please consider donating to help us develop this, and other Tezos related tools: Bitcoin: 1KSiyfgs5XwTZjaLpmCTHxonsyXMx383P1

### Credits
Coming soon - used a lot of existing libraries

### License
MIT
