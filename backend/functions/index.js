const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
let bs58;
try {
  bs58 = require('bs58');
} catch (e) {
  bs58 = null;
}
let solanaWeb3;
try {
  solanaWeb3 = require('@solana/web3.js');
} catch (e) {
  solanaWeb3 = null;
}
const cors = require('cors')({ origin: true });
const { Connection, PublicKey } = require('@solana/web3.js');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const rtdb = admin.database();

function handleOptions(req, res, allowedMethods = 'POST, OPTIONS') {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', allowedMethods);
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  return res.status(204).send('');
}

async function updateChartData(previousPrice, newPrice, volumeSOL, timestamp) {
    try {
        const candleTimestamp = Math.floor(timestamp / 60000) * 60000; // 1-minute candles
        const chartRef = rtdb.ref(`charts/SOLPSNG/${candleTimestamp}`);
        const snapshot = await chartRef.once('value');
        const existingCandle = snapshot.val();

        if (existingCandle) {
            await chartRef.update({
                high: Math.max(existingCandle.high, newPrice, previousPrice),
                low: Math.min(existingCandle.low, newPrice, previousPrice),
                close: newPrice,
                volume: existingCandle.volume + volumeSOL,
            });
        } else {
            const openPrice = previousPrice || newPrice;
            await chartRef.set({
                open: openPrice,
                high: Math.max(openPrice, newPrice),
                low: Math.min(openPrice, newPrice),
                close: newPrice,
                volume: volumeSOL,
                timestamp: candleTimestamp
            });
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}


exports.swap = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        return handleOptions(req, res);
    }
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { userId, direction, amount } = req.body;
        
        if (!userId || !direction || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'userId, direction, and a positive amount are required' });
        }

        const poolRef = db.collection('pools').doc('PSNG_SOL');
        
        try {
            const result = await db.runTransaction(async (transaction) => {
                const poolDoc = await transaction.get(poolRef);
                if (!poolDoc.exists) {
                    throw new Error('Pool not initialized');
                }

                const userSolRef = db.collection('users').doc(userId).collection('balances').doc('SOL');
                const userPsngRef = db.collection('users').doc(userId).collection('balances').doc('PSNG');
                
                const [userSolDoc, userPsngDoc] = await Promise.all([
                    transaction.get(userSolRef),
                    transaction.get(userPsngRef)
                ]);

                const userSol = userSolDoc.exists ? userSolDoc.data().amount : 0;
                const userPsng = userPsngDoc.exists ? userPsngDoc.data().amount : 0;

                let { reserveSOL, reservePSNG } = poolDoc.data();
                reserveSOL = Number(reserveSOL);
                reservePSNG = Number(reservePSNG);
                const previousPrice = reserveSOL / reservePSNG;


                const FEE = 0.02;
                let amountIn, amountOut, tokenIn, tokenOut, newReserveSOL, newReservePSNG;
                const swapTimestamp = Date.now();

                if (direction === 'buy') {
                    // Market Buy: user provides SOL amount
                    amountIn = amount;
                    tokenIn = 'SOL';
                    tokenOut = 'PSNG';

                    if (userSol < amountIn) throw new Error('Insufficient SOL balance');
                    
                    const amountInAfterFee = amountIn * (1 - FEE);
                    const k = reserveSOL * reservePSNG;
                    newReserveSOL = reserveSOL + amountInAfterFee;
                    newReservePSNG = k / newReserveSOL;
                    amountOut = reservePSNG - newReservePSNG;

                    if (amountOut <= 0 || newReservePSNG <= 0) throw new Error('Invalid swap calculation or insufficient liquidity');
                    
                    transaction.set(userSolRef, { amount: userSol - amountIn }, { merge: true });
                    transaction.set(userPsngRef, { amount: userPsng + amountOut }, { merge: true });
                    transaction.set(poolRef, { reserveSOL: newReserveSOL, reservePSNG: newReservePSNG }, { merge: true });

                } else if (direction === 'sell') {
                     // Market Sell: user provides PSNG amount
                    amountIn = amount;
                    tokenIn = 'PSNG';
                    tokenOut = 'SOL';

                    if (userPsng < amountIn) throw new Error('Insufficient PSNG balance');

                    const k = reserveSOL * reservePSNG;
                    newReservePSNG = reservePSNG + amountIn;
                    newReserveSOL = k / newReservePSNG;
                    amountOut = reserveSOL - newReserveSOL;
                    const amountOutAfterFee = amountOut * (1 - FEE);
                    
                    if (amountOutAfterFee <= 0 || newReserveSOL <= 0) throw new Error('Invalid swap calculation or insufficient liquidity');
                    
                    transaction.set(userPsngRef, { amount: userPsng - amountIn }, { merge: true });
                    transaction.set(userSolRef, { amount: userSol + amountOutAfterFee }, { merge: true });
                    transaction.set(poolRef, { reserveSOL: newReserveSOL, reservePSNG: newReservePSNG }, { merge: true });

                } else {
                    throw new Error('Invalid direction');
                }
                
                const swapData = {
                    userId,
                    direction,
                    amountIn,
                    amountOut,
                    tokenIn,
                    tokenOut,
                    exchangeRate: amountOut/amountIn,
                    fee: FEE,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                };
                transaction.set(db.collection('swaps').doc(), swapData);

                const newPrice = newReserveSOL / newReservePSNG;
                const volumeSOL = direction === 'buy' ? amountIn : amountOut;

                return {
                    previousPrice,
                    newPrice,
                    volumeSOL,
                    swapTimestamp,
                    response: {
                        success: true,
                        message: "Swap successful",
                        amountIn,
                        amountOut,
                    }
                };
            });

            await updateChartData(result.previousPrice, result.newPrice, result.volumeSOL, result.swapTimestamp);
            
            return res.status(200).json(result.response);

        } catch (error) {
            console.error('Swap failed:', error);
            return res.status(400).json({ error: error.message || 'Swap failed' });
        }
    });
});

exports.createLimitOrder = functions.https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
        return handleOptions(req, res);
    }
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        const { userId, type, amount, price } = req.body;

        if (!userId || !type || typeof amount !== 'number' || amount <= 0 || typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ error: 'userId, type, a positive amount, and a positive price are required' });
        }

        try {
            const userSolRef = db.collection('users').doc(userId).collection('balances').doc('SOL');
            const userPsngRef = db.collection('users').doc(userId).collection('balances').doc('PSNG');

            // For a real implementation, you'd lock the user's funds here in a transaction.
            // For this demo, we assume the user has enough balance and just place the order.
            
            const orderData = {
                userId,
                type, // 'buy' or 'sell'
                amount, // PSNG amount
                price, // SOL per PSNG
                total: amount * price, // Total SOL value
                status: 'open',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('orders').add(orderData);
            
            return res.status(200).json({ success: true, message: 'Limit order created successfully.' });

        } catch (error) {
            console.error('Create limit order failed:', error);
            return res.status(500).json({ error: error.message || 'Failed to create limit order' });
        }
    });
});

exports.generateChallenge = functions.https.onRequest((req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    const challenge = crypto.randomBytes(32).toString('hex');
    await db.collection('walletChallenges').doc(walletAddress).set({
      challenge,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ challenge });
  });
});

exports.verifySignatureAndLogin = functions.https.onRequest((req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { walletAddress, signature, challenge } = req.body;
    if (!walletAddress || !signature || !challenge) {
      return res.status(400).json({ error: 'walletAddress, signature, and challenge are required' });
    }
    const challengeDoc = await db.collection('walletChallenges').doc(walletAddress).get();
    if (!challengeDoc.exists || challengeDoc.data().challenge !== challenge) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }
    if (!solanaWeb3) {
      return res.status(500).json({ error: 'Solana web3.js not installed in backend' });
    }
    try {
      const pubkey = new solanaWeb3.PublicKey(walletAddress);
      const message = Buffer.from(challenge);
      const sigBuffer = Buffer.from(signature, 'base64');
      const isValid = solanaWeb3.SignaturePubkeyPair ?
        solanaWeb3.SignaturePubkeyPair.verify(pubkey, message, sigBuffer) :
        pubkey.verify(message, sigBuffer);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Signature verification failed', details: e.message });
    }
    await db.collection('walletChallenges').doc(walletAddress).delete();
    let userDoc = await db.collection('users').doc(walletAddress).get();
    let userData;
    let depositWallet;
    let depositWalletPrivateKey;
    if (!userDoc.exists) {
      let depositKeypair;
      if (solanaWeb3 && bs58) {
        depositKeypair = solanaWeb3.Keypair.generate();
        depositWallet = depositKeypair.publicKey.toBase58();
        depositWalletPrivateKey = bs58.encode(Buffer.from(depositKeypair.secretKey));
      } else {
        depositWallet = 'dummy_deposit_wallet';
        depositWalletPrivateKey = 'dummy_private_key';
      }
      userData = {
        walletAddress,
        depositWallet,
        depositWalletPrivateKey,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('users').doc(walletAddress).set(userData);
    } else {
      userData = userDoc.data();
      depositWallet = userData.depositWallet;
      depositWalletPrivateKey = userData.depositWalletPrivateKey;
    }
    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(walletAddress);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to create custom token', details: e.message });
    }
    return res.status(200).json({ customToken, user: userData, depositWallet, depositWalletPrivateKey });
  });
});

exports.updateDeposit = functions.https.onRequest((req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { walletAddress, amount } = req.body;
    if (!walletAddress || typeof amount !== 'number') {
      return res.status(400).json({ error: 'walletAddress and amount are required' });
    }
    try {
      await db.collection('deposits').add({
        walletAddress,
        amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update deposit', details: e.message });
    }
  });
});

exports.detectBalance = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { address, tokenMint, userId, tokenType } = req.body; // tokenType: 'SOL' atau 'PSNG'
    if (!address || !userId || !tokenType) return res.status(400).json({ error: 'address, userId, and tokenType required' });

    try {
      // Ganti ke devnet
      const connection = new Connection('https://api.devnet.solana.com');
      const pubkey = new PublicKey(address);
      let balance = 0;
      if (!tokenMint && tokenType === 'SOL') {
        const solBalance = await connection.getBalance(pubkey);
        balance = solBalance / 1e9;
      } else if (tokenMint && tokenType !== 'SOL') {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, { mint: new PublicKey(tokenMint) });
        if (tokenAccounts.value.length > 0) {
          balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        }
      } else {
        return res.status(400).json({ error: 'tokenMint required for SPL token' });
      }
      await db.collection('users').doc(userId).collection('balances').doc(tokenType).set({ amount: balance }, { merge: true });
      return res.status(200).json({ success: true, userId, tokenType, balance });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to detect/update balance', details: e.message });
    }
  });
});

exports.initPool = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { reserveSOL, reservePSNG, secret } = req.body;
    const ADMIN_SECRET = process.env.POOL_INIT_SECRET || 'MY_SECRET';
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden: invalid secret' });
    }
    if (typeof reserveSOL !== 'number' || typeof reservePSNG !== 'number') {
      return res.status(400).json({ error: 'reserveSOL and reservePSNG (number) required' });
    }
    try {
      await db.collection('pools').doc('PSNG_SOL').set({ reserveSOL, reservePSNG }, { merge: true });
      
      const initialPrice = reserveSOL / reservePSNG;
      const timestamp = Date.now();
      const candleTimestamp = Math.floor(timestamp / 60000) * 60000;
      await rtdb.ref(`charts/SOLPSNG/${candleTimestamp}`).set({
        open: initialPrice,
        high: initialPrice,
        low: initialPrice,
        close: initialPrice,
        volume: 0,
        timestamp: candleTimestamp
      });
      
      return res.status(200).json({ success: true, reserveSOL, reservePSNG });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to initialize pool', details: e.message });
    }
  });
});

exports.loginOrSignup = functions.https.onRequest((req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptions(req, res);
  }
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    try {
      let userDoc = await db.collection('users').doc(walletAddress).get();
      let userData;
      let depositWallet;
      let depositWalletPrivateKey;
      if (!userDoc.exists) {
        let depositKeypair;
        if (solanaWeb3 && bs58) {
          depositKeypair = solanaWeb3.Keypair.generate();
          depositWallet = depositKeypair.publicKey.toBase58();
          depositWalletPrivateKey = bs58.encode(Buffer.from(depositKeypair.secretKey));
        } else {
          depositWallet = 'dummy_deposit_wallet';
          depositWalletPrivateKey = 'dummy_private_key';
        }
        userData = {
          walletAddress,
          depositWallet,
          depositWalletPrivateKey,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection('users').doc(walletAddress).set(userData);
      } else {
        userData = userDoc.data();
        depositWallet = userData.depositWallet;
        depositWalletPrivateKey = userData.depositWalletPrivateKey;
      }
      let customToken = await admin.auth().createCustomToken(walletAddress);
      return res.status(200).json({ customToken, user: userData, depositWallet, depositWalletPrivateKey });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to login/signup', details: e.message });
    }
  });
});
