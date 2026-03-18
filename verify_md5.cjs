const crypto = require('crypto');

const hexStr = "11c4b1c15d5ec3a4c3415bb5172a4035faa24f484c5ff8c7cc2e668a881e3712ff331a4a1e5dbd25455b4f3a92b236c39b4f842820f100145d5e99640db9a473a8251141d0033a60046cfd500df5c66953700b2192b92f7ac6597ba283f7aa04418a95e014a78db4530a2a847b3c8b1535a7ae3940f8468bab2823760b9455561b809fc0de32579226cb04f11225ac67a0b782b333e7bc229b3199e774a999ded3f851252f6a662db471061bb2a557eb6d7ac9965fd9c31776d97ead61171ac8b63c75d47b4c77ce7b760a818d8a6abdae5793b1ae8fb494712d81fcb8f9caabad98d792dfbd70694f9ca064ede69754dd18bea62cae3f3ad74a3392be56b5a6";

// 1. Hash as String
const hashString = crypto.createHash('md5').update(hexStr).digest('hex').toUpperCase();
console.log("Hash as String:", hashString);

// 2. Hash as Buffer (Hex Bytes)
const buffer = Buffer.from(hexStr, 'hex');
const hashBytes = crypto.createHash('md5').update(buffer).digest('hex').toUpperCase();
console.log("Hash as Buffer:", hashBytes);

const expected = "8AB3C21AE2DEEB11CB8B740157BACAA7";
console.log("Expected:", expected);

if (hashString === expected) console.log("MATCH: String");
if (hashBytes === expected) console.log("MATCH: Buffer");
