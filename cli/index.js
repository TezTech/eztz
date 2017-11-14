#!/usr/bin/env node
//Load sodium CLI wrappers
const _sodium = require('libsodium-wrappers'),
defaultConfig = {
  provider : "",
  identities : [],
  accounts : [],
  contracts : [],
  programs : [],
},
cliColors = {
  red : '31m',
  yellow : '33m',
  cyan : '36m',
  white : '37m',
  green : '32m',
},
validCommands = [
  'man',
  'help',
  'clearData',
  'newIdentity',
  'newAccount',
  'freeAccount',
  'newContract',
  'listIdentities',
  'listAccounts',
  'listContracts',
  'balance',
  'setDelegate',
  'transfer',
  'typecheckCode',
  'typecheckData',
  'runCode',
  'contract',
  'storage',
  'head',
  'rpc',
  'provider',
];

(async() => {
    // Validate Commands
    if (process.argv.length <= 2){
        return outputError("Please enter a command!");
    }
    var command = process.argv[2], args = process.argv.slice(3);
    if (validCommands.indexOf(command) < 0 ) {
      return outputError("Invalid command");
    }
    
    // Inject eztz.js
    await _sodium.ready;
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var eztz = require("./lib/eztz.cli.js").eztz;
    eztz.library.sodium = _sodium;
    
    // Load config
    var jsonfile = require('jsonfile');
    var confFile = './config.json';
    var config = {};
    jsonfile.readFile(confFile, function(err, obj) {
      if (err){
        outputInfo('No config file found, making new one...');
        jsonfile.writeFile(defaultConfig, config);
      } else {
        config = obj;
      }
      // Load node
      if (config.provider) eztz.node.setProvider(config.provider);
      
      // Process Commands
      switch(command){
        case "man":
        case "help":
          return outputInfo('Manual coming soon');
        break;
        case "clearData":
          jsonfile.writeFile(confFile, defaultConfig);
          return output('Config file has been cleared!');
        break;
        case "newIdentity":
          if (args.length < 1) return outputError("Please enter name for the new identity");
          if (findKeyObj(config.identities, args[0])) return outputError("That identity name is already in use");
          var keys = eztz.crypto.generateKeysNoSeed();
          keys.label = args[0];
          config.identities.push(keys);
          jsonfile.writeFile(confFile, config);
          return output("New identity created " + keys.pkh);
        break;
        case "newAccount":
          if (args.length < 3) return outputError("Incorrect usage - eztz account $id $label $amount $spendable=true $delegatable=true $delegate=$id $fee=0");
          if (findKeyObj(config.accounts, args[1])) return outputError("That account name is already in use");
          var pkh = args[0], f;
          if (f = findKeyObj(config.identities, pkh)) {
            eztz.rpc.account(f, parseFloat(args[2]), true, true, f.pkh, 0).then(function(r){
              config.accounts.push({
                label : args[1],
                pkh : r.contracts[0],
                identity : pkh,
              });
              jsonfile.writeFile(confFile, config);
              return output("New faucet account created " + r.contracts[0]);
            }).catch(function(e){
              return outputError(e);
            });
          } else {
            return outputError(pkh + " is not a valid identity");
          }
        break;
        case "freeAccount":
          if (args.length < 2) return outputError("Incorrect usage - eztz freeAccount $id $label");
          if (findKeyObj(config.accounts, args[1])) return outputError("That account name is already in use");
          var pkh = args[0], f;
          if (f = findKeyObj(config.identities, pkh)) {
            eztz.rpc.freeAccount(f).then(function(r){
              config.accounts.push({
                label : args[1],
                pkh : r,
                identity : pkh,
              });
              jsonfile.writeFile(confFile, config);
              return output("New faucet account created " + r);
            }).catch(function(e){
              return outputError(e);
            });
          } else {
            return outputError(pkh + " is not a valid identity");
          }
        break;
        case "newContract":
          if (args.length < 5) return outputError("Incorrect usage - eztz originate $id $label $amount $code $init $spendable=false $delegatable=true $delegate=$id $fee=0");
          if (findKeyObj(config.contracts, args[1])) return outputError("That account name is already in use");
          var pkh = args[0], f;
          if (f = findKeyObj(config.identities, pkh)) {
            eztz.rpc.originate(f, parseFloat(args[2]), args[3], args[4], false, true, f.pkh, 0).then(function(r){
              config.contracts.push({
                label : args[1],
                pkh : r.contracts[0],
                identity : pkh,
              });
              jsonfile.writeFile(confFile, config);
              return output("New contract created " + r.contracts[0]);
            }).catch(function(e){
              return outputError(e);
            });
          } else {
            return outputError(pkh + " is not a valid identity");
          }
        break;
        
        case "listIdentities":
          for(var i = 0; i < config.identities.length; i++){
            console.log(config.identities[i].label + " - " + config.identities[i].pkh);
          }
        break;
        case "listAccounts":
          for(var i = 0; i < config.accounts.length; i++){
            console.log(config.accounts[i].label + " - " + config.accounts[i].pkh + " (" + config.accounts[i].identity + ")");
          }
        break;
        case "listContracts":
          for(var i = 0; i < config.contracts.length; i++){
            console.log(config.contracts[i].label + " - " + config.contracts[i].pkh + " (" + config.contracts[i].identity + ")");
          }
        break;
        
        case "balance":
          if (args.length < 1) return outputError("Incorrect usage - eztz balance $tz1");
          var pkh = args[0], f;
          if (f = findKeyObj(config.identities, pkh)) {
            pkh = f.pkh;
          } else if (f = findKeyObj(config.accounts, pkh)) {
            pkh = f.pkh;
          } else if (f = findKeyObj(config.contracts, pkh)) {
            pkh = f.pkh;
          }
          eztz.rpc.getBalance(pkh).then(function(r){
            return output(formatTez(r/100));
          }).catch(function(e){
            return outputError(e);
          });
        break;
        case "setDelegate":
          if (args.length < 2) return outputError("Incorrect usage - eztz setDelegate $account $delegate");
          var account = args[0], delegate = args[1], f;
          if (f = findKeyObj(config.accounts, account)) {
            keys = findKeyObj(config.identities, f.identity);
            account = f.pkh;
          } else if (f = findKeyObj(config.contracts, account)) {
            keys = findKeyObj(config.identities, f.identity);
            account = f.pkh;
          } else {
            return outputError("No valid identity to for this account");
          }
          if (f = findKeyObj(config.identities, delegate)) {
            delegate = f.pkh;
          }
          eztz.rpc.setDelegate(keys, account, delegate, 0).then(function(r){
            return output("Delegation updated - operation hash #" + r.injectedOperation);
          }).catch(function(e){
            return outputError(e);
          });
        break;
        case "transfer":
          if (args.length < 2) return outputError("Incorrect usage - eztz transfer $amount $from $to $paramters='' $fee=0");
          var amount = parseFloat(args[0]), from = args[1], to = args[2], f;
          if (f = findKeyObj(config.identities, from)) {
            keys = f;
            from = f.pkh;
          } else if (f = findKeyObj(config.accounts, from)) {
            keys = findKeyObj(config.identities, f.identity);
            from = f.pkh;
          } else if (f = findKeyObj(config.contracts, from)) {
            keys = findKeyObj(config.identities, f.identity);
            from = f.pkh;
          } else {
            return outputError("No valid identity to send this transaction");
          }
          if (f = findKeyObj(config.identities, to)) {
            to = f.pkh;
          } else if (f = findKeyObj(config.accounts, to)) {
            to = f.pkh;
          } else if (f = findKeyObj(config.contracts, to)) {
            to = f.pkh;
          }
          eztz.rpc.transfer(keys, from, to, amount, 0).then(function(r){
            return output("Transfer complete - operation hash #" + r.injectedOperation);
          }).catch(function(e){
            return outputError(e);
          });
        break;
        
        case "typecheckCode":
          if (args.length < 1) return outputError("Incorrect usage - eztz typcheckCode $code");
          eztz.rpc.typecheckCode(args[0]).then(function(r){
            return output("Well typed!");
          }).catch(function(e){
            return outputError(JSON.stringify(e));
          });
        break;
        case "typecheckData":
          if (args.length < 2) return outputError("Incorrect usage - eztz typecheckData $data $type");
          eztz.rpc.typecheckData(args[0], args[1]).then(function(r){
            return output("Well typed!");
          }).catch(function(e){
            return outputError(JSON.stringify(e));
          });
        break;
        case "runCode":
          if (args.length < 4) return outputError("Incorrect usage - eztz runCode $code $amount $input $storage $trace=true");
          eztz.rpc.runCode(args[0], parseFloat(args[1]), args[2], args[3], true).then(function(r){
            return output(JSON.stringify(r));
          }).catch(function(e){
            return outputError(JSON.stringify(e));
          });
        break;
        
        case "contract":
          if (args.length < 1) return outputError("Incorrect usage - eztz contract $account/contract");
          var pkh = args[0];
          if (f = findKeyObj(config.accounts, pkh)) {
            pkh = f.pkh;
          } else if (f = findKeyObj(config.contracts, pkh)) {
            keys = findKeyObj(config.identities, f.identity);
            pkh = f.pkh;
          }
          eztz.contract.load(pkh).then(function(r){
            console.log(r);
          }).catch(function(r){
            return outputError(r);
          });
        break;
        case "storage":
          if (args.length < 1) return outputError("Incorrect usage - eztz storage $account/contract");
          var pkh = args[0];
          if (f = findKeyObj(config.accounts, pkh)) {
            pkh = f.pkh;
          } else if (f = findKeyObj(config.contracts, pkh)) {
            keys = findKeyObj(config.identities, f.identity);
            pkh = f.pkh;
          }
          eztz.contract.storage(pkh).then(function(r){
            console.log(r);
          }).catch(function(r){
            return outputError(r);
          });
        break;
        
        case "head":
          eztz.rpc.getHead().then(function(r){
            console.log(r);
          }).catch(function(r){
            return outputError(r);
          });
        break;
        case "rpc":
          if (args.length < 1) return outputError("Incorrect usage - eztz rpc $endPoint $data='{}'");
          var e = args[0], d = (typeof args[1] != 'undefined' ? JSON.parse(args[1]) : {});
          eztz.node.query(e, d).then(function(r){
            console.log(r);
          }).catch(function(r){
            return outputError(r);
          });
        break;
        case "provider":
          if (args.length < 1) return outputError("Incorrect usage - eztz provider $provider");
          config.provider = args[0];
          jsonfile.writeFile(confFile, config);
          return output("Provider updated to " + config.provider);
        break;
        
      }
    })
})();

//Helper Functions
function outputError(e){
  console.log('\x1b['+cliColors.red+'%s\x1b[0m', "Error: " + e);
}
function outputInfo(e){
  console.log('\x1b['+cliColors.yellow+'%s\x1b[0m', e);
}
function output(e){
  console.log('\x1b['+cliColors.green+'%s\x1b[0m', e);
}
function findKeyObj(list, t){
  for (var i = 0; i < list.length; i++){
    if (list[i].pkh == t || list[i].label == t) return list[i];
  }
  return false;
}
function formatTez(a){
  return formatMoney(a)+"tz";
}
function formatMoney(n, c, d, t){
  var c = isNaN(c = Math.abs(c)) ? 2 : c, 
    d = d == undefined ? "." : d, 
    t = t == undefined ? "," : t, 
    s = n < 0 ? "-" : "", 
    i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))), 
    j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };