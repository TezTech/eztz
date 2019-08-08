describe('main', () => {
  describe('utility', () => {
    const main = require('../src/main');
    const utility = main.eztz.utility;

    test('mintotz', () => {
      const num1 = 1000000;
      const num2 = 9000000;
      expect(utility.totez(num1)).toBe(1);
      expect(utility.totez(num2)).toBe(9);
    });

    test('mutez', () => {
      const num = 0.000001;
      const num2 = 4294.967297;
      expect(utility.mutez(num)).toBe(1);
      expect(utility.mutez(num2)).toBe("4294967297");
    });

    test('b58cencode', () => {
      expect(utility.b58cencode([1], [2])).toBe('ztysqgT');
    });

    test('b58cdecode', () => {
      const data = JSON.stringify(utility.b58cdecode('ztysqgT', [2]));
      expect(data).toEqual(JSON.stringify({"type": "Buffer", "data": [1]}));
    });

    test('buf2hex', () => {
      expect(utility.buf2hex([1, 2])).toBe('0102');
    });

    test('hex2buf', () => {
      const data = JSON.stringify(utility.hex2buf('1e1d'));
      expect(data).toEqual("{\"0\":30,\"1\":29}");
    });

    test('hexNonce', () => {
      const length = 5;
      expect(utility.hexNonce(length)).toHaveLength(length);
    });

    test('sexp2mic', () => {
      expect(utility.sexp2mic('123')).toEqual({"int": "123"});
      expect(utility.sexp2mic('"456"')).toEqual({"string": "456"});
    });

    test('mic2arr', () => {
      // todo
    });

    test('ml2mic', () => {
      // todo
    });

    test('formatMoney', () => {
      // todo
    });
  });

  describe('crypto', () => {
    const main = require('../src/main');
    const crypto = main.eztz.crypto;

    test('generateMnemonic', () => {
      const string = crypto.generateMnemonic();
      expect(string.split(' ')).toHaveLength(15);
    });

    test('checkAddress', () => {
      // todo
    });

    test('generateKeysNoSeed', () => {
      const keys = crypto.generateKeysNoSeed();
      expect(typeof keys.pk).toBe('string');
      expect(typeof keys.sk).toBe('string');
      expect(typeof keys.pkh).toBe('string');
    });

    test('generateKeysNoSeed', () => {
      const keys = crypto.generateKeysSalted('test', new Buffer([2]));
      expect(typeof keys.mnemonic).toBe('string');
      expect(typeof keys.passphrase).toBe('object');
      expect(typeof keys.pk).toBe('string');
      expect(typeof keys.sk).toBe('string');
      expect(typeof keys.pkh).toBe('string');
      expect(typeof keys.salt).toBe('string');
    });

    test('generateKeys', () => {
      const keys = crypto.generateKeys('test', 'p');
      expect(typeof keys.mnemonic).toBe('string');
      expect(typeof keys.passphrase).toBe('string');
      expect(typeof keys.pk).toBe('string');
      expect(typeof keys.sk).toBe('string');
      expect(typeof keys.pkh).toBe('string');
    });

    test('generateKeysFromSeedMulti', () => {
      const keys = crypto.generateKeysFromSeedMulti('test', 'p', 3);
      expect(typeof keys.n).toBe('number');
      expect(typeof keys.mnemonic).toBe('string');
      expect(typeof keys.passphrase).toBe('string');
      expect(typeof keys.pk).toBe('string');
      expect(typeof keys.sk).toBe('string');
      expect(typeof keys.pkh).toBe('string');
    });

    test('sign', () => {
      //todo
      // const keys = crypto.sign('AA5', 'p');
      // expect(typeof keys.bytes).toBe('number');
      // expect(typeof keys.sig).toBe('string');
      // expect(typeof keys.edsig).toBe('string');
      // expect(typeof keys.sbytes).toBe('string');
    });

    test('verify', () => {
      //todo
      // const keys = crypto.sign('AA5', 'p');
      // expect(typeof keys.bytes).toBe('number');
      // expect(typeof keys.sig).toBe('string');
      // expect(typeof keys.edsig).toBe('string');
      // expect(typeof keys.sbytes).toBe('string');
    });
  });

  describe('node', () => {
    let main,
      node;

    beforeEach(() => {
      main = require('../src/main');
      node = main.eztz.node;
    });

    test('init params', () => {
      expect(node.debugMode).toBe(false);
      expect(node.async).toBe(true);
      expect(node.activeProvider).toBe('https://tezrpc.me/zeronet');
    });

    test('setDebugMode', () => {
      node.setDebugMode(true);
      expect(node.debugMode).toBe(true);

      node.setDebugMode(false);
      expect(node.debugMode).toBe(false);
    });

    test('setProvider', () => {
      node.setProvider('https://tezrpc.me/zeronet2');
      expect(node.activeProvider).toBe('https://tezrpc.me/zeronet2');
    });

    test('resetProvider', () => {
      node.setProvider('https://tezrpc.me/zeronet2');
      node.resetProvider();
      expect(node.activeProvider).toBe('https://tezrpc.me/zeronet');
    });

    describe('query', () => {
      const oldXMLHttpRequest = window.XMLHttpRequest;
      let mockXHR;

      const createMockXHR = (responseJSON) => {
        const mockXHR = {
          open: jest.fn(),
          send: jest.fn(),
          readyState: 4,
          responseText: JSON.stringify(
            responseJSON || {}
          )
        };
        return mockXHR;
      };

      beforeEach(() => {
        mockXHR = createMockXHR();
        window.XMLHttpRequest = jest.fn(() => mockXHR);
      });

      afterEach(() => {
        window.XMLHttpRequest = oldXMLHttpRequest;
      });

      test('query on error', () => {
        const p = node.query('/test');
        expect(mockXHR.open).toBeCalledWith('POST', 'https://tezrpc.me/zeronet/test', true);
        expect(mockXHR.send).toBeCalledWith('{}');

        mockXHR.statusText = 'test';
        mockXHR.onerror();

        return expect(p).rejects.toEqual('test');
      });

      test('query on 200 error', () => {
        const p = node.query('/test');

        mockXHR.status = 200;
        mockXHR.responseText = JSON.stringify({
          error: 'err'
        });
        mockXHR.onload();

        return expect(p).rejects.toEqual('err');
      });

      test('query on 200 empty response', () => {
        const p = node.query('/test');

        mockXHR.status = 200;
        mockXHR.responseText = null;
        mockXHR.onload();

        return expect(p).rejects.toEqual('Empty response returned');
      });

      test('query on 200 empty response without', () => {
        const p = node.query('/test');

        mockXHR.status = 200;
        mockXHR.responseText = JSON.stringify({
          test: 'test'
        });
        mockXHR.onload();

        return expect(p).resolves.toEqual({
          test: 'test'
        });
      });

      test('query on 200 ok', () => {
        const p = node.query('/test');

        mockXHR.status = 200;
        mockXHR.responseText = JSON.stringify({
          ok: 'ok'
        });
        mockXHR.onload();

        return expect(p).resolves.toEqual('ok');
      });

      test('query non 200', () => {
        const p = node.query('/test');

        mockXHR.status = 400;
        mockXHR.statusText = 'err';
        mockXHR.onload();

        return expect(p).rejects.toEqual('err');
      });

      test('getBalance using Pocket Network', async () => {
        // Set Pocket options (DeveloperID, NetID, MaxNodes, timeOut, sslOnly)
        main.setPocketOpts("", "MAINNET", null, null, null)

        eztz_pocket.rpc.getBalance("tz1LSAycAVcNdYnXCy18bwVksXci8gUC2YpA").then(function(res) {
          expect(res).resolves.toEqual("0");
        }, function(err) {
          expect(err).resolves.toEqual("0");
        });
      });
    })
  });
});
