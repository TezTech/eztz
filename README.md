# eztz - Javascript API library for Tezos
This library is compatible with the Tezos blockchain, implementing communication with the JSON RPC API and providing key generation, signing, verification, and contract interfaction. Try our [Live demo](https://stephenandrews.github.io/eztz/) - it's eztz!

You can checkout our [Documentation](https://github.com/stephenandrews/eztz/wiki/Documentation), or follow installation below.

**By default, eztz will connect to https://tezrpc.me - a network of community supplied Tezos nodes. You can switch this to use your own local node, or a node of your choosing.**

## Installation
In browser, just include eztz.js and you're good to go.

**NPM plugin in development**

## Building
Rebuild bundle using the following code (requires browserify):

```
browserify main.js -o eztz.js
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
We will be working on this library on a regular basis, with hopes of adding more functiliaty (message signing/verification etc).

## Contribute
Please feel free to contribute - I will merge and pull requests as soon as I've gone through the changes.

## Author
Stephen Andrews

## Support Us
Please consider donating to help me develop this and other Tezos related tools

Bitcoin: 1KSiyfgs5XwTZjaLpmCTHxonsyXMx383P1

## Credits
https://github.com/bitcoinjs/bs58check (for base58check encode/decode)  
https://github.com/jedisct1/libsodium.js (for all crypto related functions)  
https://github.com/bitcoinjs/bip39 (for mnemonic code)  
https://github.com/crypto-browserify/pbkdf2 (for passphrase hashing)  
https://github.com/feross/buffer (for browser buffer)

## License
MIT
