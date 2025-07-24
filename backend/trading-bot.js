// Cerdas Trading Bot untuk TradeFlow
const axios = require('axios');

// --- KONFIGURASI ---
const config = {
  // Ganti dengan URL Cloud Function Anda setelah deploy
  functionsBaseUrl: 'https://us-central1-tradeflow-f12a9.cloudfunctions.net',
  // Ganti dengan User ID (Wallet Address) yang akan digunakan oleh bot
  userId: 'B94Cr5yDs23CV8Lh5Z54Amy6XkCho1uL4xXeukncE4H5',
  interval: 5000, // 5 detik
  maxTransactions: 10000,
  initialBotBalance: {
    sol: 1000,
    psng: 10000000,
  },
  // Persentase dari total likuiditas yang digunakan untuk menentukan ukuran trade
  tradeSizePercentage: 0.02, // 2% dari total SOL di pool per trade
};

// --- State Internal Bot ---
let state = {
  transactionCount: 0,
  botSolBalance: 0,
  botPsngBalance: 0,
  poolSol: 88,
  poolPsng: 17000000,
  intervalId: null,
};

// --- FUNGSI UTAMA BOT ---

function getRandomAmount(baseValue, percentage) {
  const tradeSize = baseValue * percentage;
  const amount = Math.random() * tradeSize + (tradeSize * 0.5);
  return parseFloat(amount.toFixed(4));
}

function getSmartDirection() {
  const solValue = state.botSolBalance;
  const psngValue = state.botPsngBalance * (state.poolSol / state.poolPsng);
  
  if (psngValue > solValue * 1.2) {
    return Math.random() < 0.7 ? 'sell' : 'buy';
  }
  if (solValue > psngValue * 1.2) {
    return Math.random() < 0.7 ? 'buy' : 'sell';
  }
  return Math.random() < 0.5 ? 'buy' : 'sell';
}

async function performSwap() {
  if (state.transactionCount >= config.maxTransactions) {
    console.log(`Mencapai batas maksimum transaksi (${config.maxTransactions}). Bot berhenti.`);
    clearInterval(state.intervalId);
    process.exit(0);
  }

  try {
    const direction = getSmartDirection();
    let amount;

    if (direction === 'buy') {
      amount = getRandomAmount(state.poolSol, config.tradeSizePercentage);
      if (state.botSolBalance < amount) {
        console.warn(`Saldo SOL bot tidak cukup (${state.botSolBalance.toFixed(2)}), mencoba trade yang lebih kecil.`);
        amount = state.botSolBalance * 0.5;
        if (amount < 0.0001) {
            console.error("Saldo SOL habis. Bot berhenti.");
            clearInterval(state.intervalId);
            return;
        }
      }
    } else {
      const solEquivalentAmount = getRandomAmount(state.poolSol, config.tradeSizePercentage);
      amount = solEquivalentAmount / (state.poolSol / state.poolPsng);

      if (state.botPsngBalance < amount) {
        console.warn(`Saldo PSNG bot tidak cukup (${state.botPsngBalance.toFixed(2)}), mencoba trade yang lebih kecil.`);
        amount = state.botPsngBalance * 0.5;
         if (amount < 1) {
            console.error("Saldo PSNG habis. Bot berhenti.");
            clearInterval(state.intervalId);
            return;
        }
      }
    }

    state.transactionCount++;
    console.log(`[${state.transactionCount}/${config.maxTransactions}] Eksekusi: ${direction.toUpperCase()} ${amount.toFixed(4)} ${direction === 'buy' ? 'SOL' : 'PSNG'}`);

    const response = await axios.post(`${config.functionsBaseUrl}/swap`, {
      userId: config.userId,
      direction,
      amount,
    });
    
    if (response.data.success) {
      const { amountIn, amountOut } = response.data;
      if (direction === 'buy') {
        state.botSolBalance -= amountIn;
        state.botPsngBalance += amountOut;
        state.poolSol += amountIn;
        state.poolPsng -= amountOut;
      } else {
        state.botPsngBalance -= amountIn;
        state.botSolBalance += amountOut;
        state.poolPsng += amountIn;
        state.poolSol -= amountOut;
      }

      console.log(`  -> Berhasil: Dapat ${response.data.amountOut.toFixed(4)} ${direction === 'buy' ? 'PSNG' : 'SOL'}`);
      console.log(`  -> Saldo Bot: ${state.botSolBalance.toFixed(2)} SOL, ${state.botPsngBalance.toFixed(2)} PSNG`);
      console.log(`  -> Pool (Estimasi): ${state.poolSol.toFixed(2)} SOL, ${state.poolPsng.toFixed(2)} PSNG`);
    } else {
       throw new Error(response.data.error || 'Unknown swap error');
    }

  } catch (error) {
    const errorMessage = error.response ? error.response.data.error : error.message;
    console.error(`Error saat swap: ${errorMessage}. Mencoba lagi...`);
  }
}

async function initializeBot() {
  console.log('Menginisialisasi bot...');
  try {
    // Fungsi 'loginOrSignup' akan membuat user jika belum ada dan memberikan custom token.
    const response = await axios.post(`${config.functionsBaseUrl}/loginOrSignup`, {
      walletAddress: config.userId,
    });
    console.log(`User ${config.userId} siap digunakan.`);

    // Mengatur saldo awal bot secara lokal, dan memanggil fungsi untuk menambahkan di backend.
    state.botSolBalance = config.initialBotBalance.sol;
    state.botPsngBalance = config.initialBotBalance.psng;
    
    // Panggil fungsi untuk menambahkan saldo di backend (opsional, tapi bagus untuk konsistensi)
    // Anda perlu membuat fungsi 'addBalance' di Firebase Functions
    /*
    await axios.post(`${config.functionsBaseUrl}/addBalance`, {
      userId: config.userId,
      token: 'SOL',
      amount: config.initialBotBalance.sol
    });
    await axios.post(`${config.functionsBase_url}/addBalance`, {
      userId: config.userId,
      token: 'PSNG',
      amount: config.initialBotBalance.psng
    });
    */
    console.log(`Saldo awal bot diatur ke: ${state.botSolBalance} SOL, ${state.botPsngBalance} PSNG`);
    
    return true;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Gagal menginisialisasi bot: ${errorMessage}`);
    console.error('Pastikan Firebase Functions Anda sudah di-deploy dan URL-nya benar.');
    return false;
  }
}

async function run() {
  console.log('Bot trading Cerdas dijalankan...');
  const ready = await initializeBot();
  if (!ready) {
    process.exit(1);
  }

  console.log(`Memulai trading dengan interval ${config.interval} ms...`);
  await performSwap();
  state.intervalId = setInterval(performSwap, config.interval);
}

process.on('SIGINT', () => {
  console.log('\nBot dihentikan secara manual.');
  if (state.intervalId) clearInterval(state.intervalId);
  process.exit(0);
});

run();