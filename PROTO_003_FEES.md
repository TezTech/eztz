# Fee changes for proto 003

**Fees are in mutez, and should be at least:**

```minfees >= 100 + (gas * .1) + (opbytes * 1)```

**Reveals**
- storage_limit : 0
- gas_limit : 10000
- opbytes : ~169
- fee : 1269

**Delegations**
- storage_limit : 0
- gas_limit : 10000
- opbytes : ~157
- fee : 1257

**Originations**
- storage_limit : 257
- gas_limit : 10000
- opbytes : ~185
- fee : ~1285

*Incurs an additional .257tz origination burn fee (for the source)*

**Transactions to KT1/active implicit account***
- storage_limit : 0
- gas_limit : 10100
- opbytes : ~162
- fee : 1272

**Transactions to inactive implicit account**
- storage_limit : 257
- gas_limit : 10100
- opbytes : ~162
- fee : 1272

*Incurs an additional .257tz origination burn fee (for the source)*

**Emptying an implicit account**
- gas_limit: add 160
- fee: add 16

***Also note the following***
- opbytes is a rough estimate for basic operations. You need to use the actual size of the serialized operation bytes, which includes the 32 byte header and the 64 byte signature.
- An inactive implicity account is a tz account with nil (0) balance which isn't registered as a delegate/baker
