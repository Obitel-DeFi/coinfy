import Bitcoin from 'bitcoinjs-lib'
import Big from 'big.js'
import { encryptAES128CTR, decryptAES128CTR } from '/api/crypto'
import { decimalsMax } from '/api/numbers'
import {
    decryptBIP38 as _decryptBIP38,
    encryptBIP38 as _encryptBIP38
} from '/api/crypto'

// private
const test = true
const mainnet = Bitcoin.networks.bitcoin // 0x80
const testnet = Bitcoin.networks.testnet // 0xef
const network = test ? testnet : mainnet
const url = test
    ? 'https://test-insight.bitpay.com'
    : 'https://insight.bitpay.com'
const api_url = `${url}/api` // https://github.com/bitpay/insight-api

// exports
export const type = 'wallet'
export const symbol = 'BTC'
export const name = 'Bitcoin'
export const color = '#fdb033'
export const ascii = 'Ƀ'
export const price_decimals = 0
export const satoshis = 100000000

export function format(value, dec = 18) {
    const tof = typeof value
    if (tof != 'number' && tof != 'string') value = '0'
    return `${decimalsMax(value, dec)} ${symbol}`
}

export function generateRandomWallet() {
    const wallet = Bitcoin.ECPair.makeRandom({ network: network })
    wallet.compressed = false
    return { address: wallet.getAddress(), private_key: wallet.toWIF() }
}

// https://en.bitcoin.it/wiki/List_of_address_prefixes
export function isAddress(address) {
    return network === mainnet
        ? /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)
        : /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)
}

export function isAddressCheck(address) {
    try {
        Bitcoin.address.fromBase58Check(address)
    } catch (e) {
        // console.error(e)
        return false
    }
    return true
}

// export function isPublicKey(public_key) {
//     return /^([0-9a-fA-F]{66}|[0-9a-fA-F]{130})$/.test(public_key)
// }

export function isPrivateKey(private_key) {
    return (
        isWalletImportFormat(private_key) ||
        isCompressedWalletImportFormat(private_key)
        // isHexFormat(private_key) ||
        // isBase64Format(private_key)
    )
}

export function isPrivateKeyBip(private_key) {
    // https://github.com/pointbiz/bitaddress.org/blob/67e167930c4ebd9cf91047c36792c4e32dc41f11/src/ninja.key.js#L38
    return /^6P[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{56}$/.test(
        private_key
    )
}

export function isWalletImportFormat(key) {
    key = key.toString()
    return network === mainnet
        ? /^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(
              key
          )
        : /^9[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(
              key
          )
}

export function isCompressedWalletImportFormat(key) {
    key = key.toString()
    return network === mainnet
        ? /^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(
              key
          )
        : /^c[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(
              key
          )
}

export function getAddressFromPrivateKey(private_key) {
    const wallet = Bitcoin.ECPair.fromWIF(private_key, network)
    return wallet.getAddress().toString()
}

// export function getAddressFromPublicKey(public_key) {
//     const publicKeyBuffer = new Buffer(public_key, 'hex')
//     const wallet = Bitcoin.ECPair.fromPublicKeyBuffer(publicKeyBuffer, network)
//     return wallet.getAddress().toString()
//     // console.log(new Bitcoin.ECPair(null, wallet.Q, { compressed: true }).getAddress())
//     // console.log(new Bitcoin.ECPair(null, wallet.Q, { compressed: false }).getAddress())
// }

export function getAllFormats(wallet) {
    const formats = {}
    if (typeof wallet == 'string')
        wallet = Bitcoin.ECPair.fromWIF(wallet, network)
    formats.compressed = wallet.compressed
    wallet.compressed = false
    formats.address = wallet.getAddress()
    formats.public_key = wallet.getPublicKeyBuffer().toString('hex')
    formats.private_key = wallet.toWIF()
    wallet.compressed = true
    formats.address_comp = wallet.getAddress()
    formats.public_key_comp = wallet.getPublicKeyBuffer().toString('hex')
    formats.private_key_comp = wallet.toWIF()
    return formats
}

export function urlInfo(address) {
    return `${url}/address/${address}`
}

export function urlInfoTx(txid) {
    return `${url}/tx/${txid}`
}

export function encrypt(private_key_encrypted, password) {
    return encryptAES128CTR(private_key_encrypted, password)
}

export function decrypt(address, private_key_encrypted, password) {
    const private_key = decryptAES128CTR(private_key_encrypted, password)

    if (isPrivateKey(private_key)) {
        if (getAddressFromPrivateKey(private_key) === address)
            return private_key
    }

    return false
}

export function encryptBIP38(privateKey, password, progressCallback) {
    return _encryptBIP38(privateKey, password, progressCallback)
}

export function decryptBIP38(encryptedKey, password, progressCallback) {
    return _decryptBIP38(encryptedKey, password, progressCallback, network.wif)
}

// fetchs
export function fetchBalance(address) {
    // return fetch(`${api_url}/addr/${address}/balance`)
    //     .then(response => response.text())
    //     .then(balance => {
    //         // return Number(balance) / satoshis
    //         return Big(balance).div(satoshis).toString()
    //     })
    return fetchTotals(address).then(data => {
        return data.unconfirmedBalance < 0
            ? data.balance + data.unconfirmedBalance
            : data.balance
    })
}

// In shatosis
export function fetchRecomendedFee() {
    // https://btc-bitcore1.trezor.io/api/utils/estimatefee
    // https://bitcoinfees.21.co/api/v1/fees/recommended
    // https://www.bitgo.com/api/v1/tx/fee
    return fetch(`https://insight.bitpay.com/api/utils/estimatefee`)
        .then(response => response.json())
        .then(fees => fees[2])
}

export function fetchTxs(address, from = 0, to = from + 25) {
    return fetch(
        `${api_url}/addrs/${address}/txs?noScriptSig=1&noAsm=1&noSpent=0&from=${
            from
        }&to=${to}`
    )
        .then(response => response.json())
        .then(json => {
            const data = {
                totalTxs: json.totalItems,
                txs: []
            }
            json.items.forEach(txRaw => {
                let index, total
                let value = Big(0)
                let tx = {
                    txid: txRaw.txid,
                    fees: Big(txRaw.fees),
                    time: txRaw.time,
                    confirmations: txRaw.confirmations,
                    value: Big(0)
                    // raw: txRaw,
                }

                for (
                    index = 0, total = txRaw.vin.length;
                    index < total;
                    ++index
                ) {
                    if (txRaw.vin[index].addr === address) {
                        tx.value = tx.value.minus(txRaw.vin[index].value)
                    }
                }

                for (
                    index = 0, total = txRaw.vout.length;
                    index < total;
                    ++index
                ) {
                    if (
                        txRaw.vout[index].scriptPubKey &&
                        txRaw.vout[index].scriptPubKey.addresses &&
                        txRaw.vout[index].scriptPubKey.addresses.indexOf(
                            address
                        ) > -1
                    ) {
                        tx.value = tx.value.add(txRaw.vout[index].value)
                        // break // maybe
                    }
                }

                // console.log(txRaw)
                data.txs.push(tx)
            })
            // console.log( json )
            return data
        })
}

export function fetchSummary(address) {
    const totals = {}
    return fetchTotals(address)
        .then(data => {
            totals.balance = data.balance
            totals.totalReceived = data.totalReceived
            totals.totalSent = data.totalSent
            totals.unconfirmedBalance = data.unconfirmedBalance
            return fetchTxs(address)
        })
        .then(txs => Object.assign(txs, totals))
}

export function fetchTotals(address) {
    return fetch(`${api_url}/addr/${address}`)
        .then(response => response.json())
        .then(totals => totals)
}

export function createSimpleTxOutputs(from, to, balance, amount, fee) {
    const outputs = []
    amount = Big(amount)
    const moneyBack = Big(balance)
        .minus(amount)
        .minus(Big(fee))

    outputs.push({ address: to, amount: Number(amount.times(satoshis)) })
    if (moneyBack.gt(0))
        outputs.push({
            address: from,
            amount: Number(moneyBack.times(satoshis))
        })

    return outputs
}

export function createTx(private_key, outputs) {
    const address = getAddressFromPrivateKey(private_key)
    return fetch(`${api_url}/addr/${address}/utxo?noCache=1`)
        .then(response => response.json())
        .then(txs => {
            const lastTx = txs[0]
            const txid = lastTx.txid
            const vout = lastTx.vout
            const txb = new Bitcoin.TransactionBuilder(network)
            txb.addInput(txid, vout)
            outputs.forEach(output => {
                txb.addOutput(output.address, output.amount)
            })
            txb.sign(0, Bitcoin.ECPair.fromWIF(private_key, network))
            const txHex = txb.build().toHex()
            // let a = new TxDecoder(txHex, network) // https://github.com/you21979/node-multisig-wallet/blob/master/lib/txdecoder.js
            // console.log(a.decode())
            return txHex
        })
}

export function sendRawTx(rawTx) {
    const fetchOptions = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            rawtx: rawTx
        })
    }
    return fetch(`${api_url}/tx/send`, fetchOptions)
        .then(response => response.json())
        .then(totals => totals)
}

export function getSendProviders() {
    return sendProviders[test ? 'test' : 'main']
}

const sendProviders = {
    main: {},
    test: [
        {
            name: 'Bitpay.com',
            url: 'https://test-insight.bitpay.com/tx/send',
            request: e => {},
            response: e => {}
        },
        {
            name: 'Paco pil',
            url: 'https://test-insight/tx/send',
            request: e => {},
            response: e => {}
        }
    ]
}

/*
// To allow: https://www.bitaddress.org
Private Key Hexadecimal Format (64 characters [0-9A-F]):
Private Key Base64 (44 characters):


export function isHexFormat(key) {
    key = key.toString();
    return /^[A-Fa-f0-9]{64}$/.test(key);
}


export function isBase64Format(key) {
    key = key.toString();
    return (/^[ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789=+\/]{44}$/.test(key));
}



function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

function base64ToBytes(base64) {
    // Remove non-base-64 characters
    var base64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    base64 = base64.replace(/[^A-Z0-9+\/]/ig, "");

    for (var bytes = [], i = 0, imod4 = 0; i < base64.length; imod4 = ++i % 4) {
        if (imod4 == 0) continue;
        bytes.push(((base64map.indexOf(base64.charAt(i - 1)) & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2)) |
        (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
    }

    return bytes;
}


function getBitcoinWalletImportFormat(bytes) {
    if (bytes == null) return "";
    bytes.unshift(network); // prepend 0x80 byte
    var checksum = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), { asBytes: true });
    bytes = bytes.concat(checksum.slice(0, 4));
    var privWif = Bitcoin.Base58.encode(bytes);
    return privWif;
};

function getBitcoinPrivateKeyByteArray(priv) {
    if (priv == null) return null;
    // Get a copy of private key as a byte array
    var bytes = priv.toByteArrayUnsigned();
    // zero pad if private key is less than 32 bytes 
    while (bytes.length < 32) bytes.unshift(0x00);
    return bytes;
};
*/