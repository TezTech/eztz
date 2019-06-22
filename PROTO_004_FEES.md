# Fee changes for proto 004

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

**Transactions to KT1/active implicit (tz) account***
- storage_limit : 0
- gas_limit : 10200
- opbytes : ~162
- fee : 1282

**Transactions to inactive implicit (tz) account**
- storage_limit : 257
- gas_limit : 10200
- opbytes : ~162
- fee : 1282

*Incurs an additional .257tz origination burn fee (for the source)*

**Emptying an implicit (tz) account**
- gas_limit: add 320
- fee: add 32

***Also note the following***
- opbytes is a rough estimate for basic operations. You need to use the actual size of the serialized operation bytes, which includes the 32 byte header and the 64 byte signature.
- opbytes increase when sending a larger amount of XTZ - e.g. 1Mtz will cost ~4mutez more than sending 1tz
- An inactive implicit account is a tz account with nil (0) balance which isn't registered as a delegate/baker
- A buffer of 100 gas and 100mutez is recommended
- Recommended settings for transactions should be fee of 1420mutez, storage limit of 300, and gas limit of 10600 (to cover a variety of cases)
