// Cerdas Trading Bot untuk TradeFlow
// Bot ini dirancang untuk berinteraksi dengan Firebase Functions Anda 
// dan menciptakan aktivitas pasar yang realistis.

const axios = require('axios');

// --- KONFIGURASI ---
const config = {
  // Ganti dengan URL Cloud Function Anda
  functionsBaseUrl: 'https://us-central1-tradeflow-f12a9.cloudfunctions.net',
  // Ganti dengan User ID (Wallet Address) yang akan digunakan oleh bot
  userId: 'B94Cr5yDs23CV8Lh5Z54Amy6XkCho1uL4xXeukncE4H5',
  // Interval antar transaksi (dalam milidetik)
  interval: 5000, // 5 detik
  // Jumlah transaksi maksimum sebelum bot berhenti
  maxTransactions: 10000,
  // Saldo awal yang akan ditambahkan ke akun bot jika diperlukan
  initialBotBalance: {
    sol: 1000,
    psng: 10000000,
  },
  // Persentase dari total likuiditas yang digunakan untuk menentukan ukuran trade
  tradeSizePercentage: 0.005, // 0.5% dari total SOL di pool per trade
};

// --- State Internal Bot ---
let state = {
  transactionCount: 0,
  botSolBalance: 0,
  botPsngBalance: 0,
  poolSol: 88, // Sesuaikan dengan likuiditas awal Anda
  poolPsng: 17000000, // Sesuaikan dengan likuiditas awal Anda
  intervalId: null,
};

// --- FUNGSI UTAMA BOT ---

/**
 * Mendapatkan jumlah acak dalam rentang persentase dari nilai basis.
 * @param {number} baseValue - Nilai dasar untuk perhitungan (misal: total SOL di pool).
 * @param {number} percentage - Persentase dari baseValue.
 * @returns {number} - Jumlah acak.
 */
function getRandomAmount(baseValue, percentage) {
  const tradeSize = baseValue * percentage;
  // Ambil nilai acak antara 50% dan 150% dari ukuran trade standar
  const amount = Math.random() * tradeSize + (tradeSize * 0.5);
  return parseFloat(amount.toFixed(4));
}

/**
 * Memutuskan apakah akan membeli atau menjual berdasarkan saldo bot.
 * @returns {'buy'|'sell'}
 */
function getSmartDirection() {
  // Jika bot punya terlalu banyak PSNG, lebih mungkin untuk menjual.
  // Jika bot punya terlalu banyak SOL, lebih mungkin untuk membeli.
  const solValue = state.botSolBalance;
  const psngValue = state.botPsngBalance * (state.poolSol / state.poolPsng);
  
  // Jika nilai PSNG lebih dari 20% lebih tinggi dari nilai SOL, cenderung jual
  if (psngValue > solValue * 1.2) {
    return Math.random() < 0.7 ? 'sell' : 'buy'; // 70% kemungkinan sell
  }
  // Jika nilai SOL lebih dari 20% lebih tinggi dari nilai PSNG, cenderung beli
  if (solValue > psngValue * 1.2) {
    return Math.random() < 0.7 ? 'buy' : 'sell'; // 70% kemungkinan buy
  }
  // Jika seimbang, 50/50
  return Math.random() < 0.5 ? 'buy' : 'sell';
}

/**
 * Fungsi utama untuk melakukan satu transaksi swap.
 */
async function performSwap() {
  if (state.transactionCount >= config.maxTransactions) {
    console.log(`Mencapai batas maksimum transaksi (${config.maxTransactions}). Bot berhenti.`);
    clearInterval(state.intervalId);
    process.exit(0);
  }

  try {
    const direction = getSmartDirection();
    let amount;

    if (direction === 'buy') { // Beli PSNG pakai SOL
      amount = getRandomAmount(state.poolSol, config.tradeSizePercentage);
      if (state.botSolBalance < amount) {
        console.warn(`Saldo SOL bot tidak cukup (${state.botSolBalance.toFixed(2)}), mencoba trade yang lebih kecil.`);
        amount = state.botSolBalance * 0.5; // Coba jual separuh sisa saldo
        if (amount < 0.0001) {
            console.error("Saldo SOL habis. Bot berhenti.");
            clearInterval(state.intervalId);
            return;
        }
      }
    } else { // Jual PSNG dapat SOL
      // Hitung jumlah PSNG yang setara dengan persentase dari pool SOL
      const solEquivalentAmount = getRandomAmount(state.poolSol, config.tradeSizePercentage);
      amount = solEquivalentAmount / (state.poolSol / state.poolPsng); // konversi ke PSNG

      if (state.botPsngBalance < amount) {
        console.warn(`Saldo PSNG bot tidak cukup (${state.botPsngBalance.toFixed(2)}), mencoba trade yang lebih kecil.`);
        amount = state.botPsngBalance * 0.5; // Coba jual separuh sisa saldo
         if (amount < 1) {
            console.error("Saldo PSNG habis. Bot berhenti.");
            clearInterval(state.intervalId);
            return;
        }
      }
    }

    state.transactionCount++;
    console.log(`[${state.transactionCount}/${config.maxTransactions}] Eksekusi: ${direction.toUpperCase()} ${amount.toFixed(4)} ${direction === 'buy' ? 'SOL' : 'PSNG'}`);

    // Panggil endpoint swap
    const response = await axios.post(`${config.functionsBaseUrl}/swap`, {
      userId: config.userId,
      direction,
      amount,
    });
    
    // Update state internal bot
    if (direction === 'buy') {
      state.botSolBalance -= amount;
      state.botPsngBalance += response.data.amountOut;
      state.poolSol += amount;
      state.poolPsng -= response.data.amountOut;
    } else { // sell
      state.botPsngBalance -= amount;
      state.botSolBalance += response.data.amountOut;
      state.poolPsng += amount;
      state.poolSol -= response.data.amountOut;
    }

    console.log(`  -> Berhasil: Dapat ${response.data.amountOut.toFixed(4)} ${direction === 'buy' ? 'PSNG' : 'SOL'}`);
    console.log(`  -> Saldo Bot: ${state.botSolBalance.toFixed(2)} SOL, ${state.botPsngBalance.toFixed(2)} PSNG`);
    console.log(`  -> Pool: ${state.poolSol.toFixed(2)} SOL, ${state.poolPsng.toFixed(2)} PSNG`);

  } catch (error) {
    const errorMessage = error.response ? error.response.data.error : error.message;
    console.error(`Error saat swap: ${errorMessage}. Mencoba lagi...`);
  }
}

/**
 * Inisialisasi: Membuat user dan menambahkan saldo jika belum ada.
 */
async function initializeBot() {
  console.log('Menginisialisasi bot...');
  try {
    // Fungsi 'loginOrSignup' akan membuat user jika belum ada
    await axios.post(`${config.functionsBaseUrl}/loginOrSignup`, {
      walletAddress: config.userId,
    });
    console.log(`User ${config.userId} siap digunakan.`);

    // Mengatur saldo awal bot secara lokal tanpa memanggil detectBalance
    state.botSolBalance = config.initialBotBalance.sol;
    state.botPsngBalance = config.initialBotBalance.psng;
    console.log(`Saldo awal bot diatur ke: ${state.botSolBalance} SOL, ${state.botPsngBalance} PSNG`);
    
    return true;
  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Gagal menginisialisasi bot: ${errorMessage}`);
    console.error('Pastikan Firebase Functions Anda sudah di-deploy dan URL-nya benar.');
    return false;
  }
}

/**
 * Fungsi utama untuk menjalankan bot.
 */
async function run() {
  console.log('Bot trading Cerdas dijalankan...');
  const ready = await initializeBot();
  if (!ready) {
    process.exit(1);
  }

  console.log(`Memulai trading dengan interval ${config.interval} ms...`);
  // Lakukan trade pertama, lalu set interval
  await performSwap();
  state.intervalId = setInterval(performSwap, config.interval);
}

// Menangani interupsi (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nBot dihentikan secara manual.');
  if (state.intervalId) clearInterval(state.intervalId);
  process.exit(0);
});

// Jalankan bot
run();
