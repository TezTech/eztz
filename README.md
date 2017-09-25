# eztz
Easy Tezos key generator and utility tool - It's E-Z-T-Z!

### Installation
In browser, just include eztz.js and you're good to go.

### Building
Run browserify main.js -o eztz.js to rebuild the bundle.

### Usage
Include the eztz.js file and run the eztz_ready function as per below:
<script src="./eztz.js"></script>
<script>
    /* eztz is now ready to use */
    eztz_ready(function(eztz){
        var m = eztz.generateMnemonic();
        var keys = eztz.generateKeys(m, 'test');
        console.log(keys);
    });
</script>

### Credits
Coming soon - used a lot of existing libraries

### License
MIT