# eztz - Javascript API library for Tezos

[![Build
Status](https://travis-ci.org/stephenandrews/eztz.svg?branch=master)](https://travis-ci.org/stephenandrews/eztz) [![codecov](https://codecov.io/gh/stephenandrews/eztz/branch/master/graph/badge.svg)](https://codecov.io/gh/stephenandrews/eztz)

This library is compatible with the Tezos blockchain, implementing communication with the JSON RPC API and providing key generation, signing, verification, and contract interaction. Try our [Live demo](https://stephenandrews.github.io/eztz/) - it's eztz!

You can checkout our [Documentation](https://github.com/stephenandrews/eztz/wiki/Documentation), or follow installation below.

**By default, eztz will connect to https://tezrpc.me - a network of community supplied Tezos nodes. You can switch this to use your own local node, or a node of your choosing, via eztz.node.setProvider(url).**

## Installation
In browser, just include eztz.js and you're good to go.

**NPM plugin in development**

## Building
Rebuild bundle using the following code (requires webpack):

```
npm run-script build
```

## Usage
Include the eztz.js file and use the eztz object directly:
```html
<script src="./eztz.js"></script>
<script>
    eztz.rpc.getBalance("tz1LSAycAVcNdYnXCy18bwVksXci8gUC2YpA").then(function(res){
        alert("Your balance is " + res);
    }).catch(function(e){
        console.log(e);
    });
</script>
```

## Future Development
Our current goals are:
* Complete RPC object to encompass the entire RPC API spec
* Work on Contract object, to allow better integration with smart contracts (deployment, sending to, and reading storage)

## Contribute
Please feel free to contribute - I will merge any pull requests as soon as I've gone through the changes.

## Author
Stephen Andrews

## Support Us
Please consider donating to help me develop this and other Tezos related tools, I currently rely on the kindness of others.

Bitcoin: 1KSiyfgs5XwTZjaLpmCTHxonsyXMx383P1

## Credits
https://github.com/bitcoinjs/bs58check (for base58check encode/decode)  
https://github.com/jedisct1/libsodium.js (for all crypto related functions)  
https://github.com/bitcoinjs/bip39 (for mnemonic code)  
https://github.com/crypto-browserify/pbkdf2 (for passphrase hashing)  
https://github.com/feross/buffer (for browser buffer)

## License
MIT
