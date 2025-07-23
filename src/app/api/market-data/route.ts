
import { NextResponse } from 'next/server';

// This is a simplified backend for demonstration purposes.
// In a real application, this data would come from a real-time database,
// blockchain data, or a dedicated market data provider.

// Initial state for our assets
let assets = [
  { 
    id: 'PSNG/SOL', 
    name: 'Pasino',
    icon: {
      src: "/psng.png",
      alt: "Pasino logo"
    },
    price: 0.135,
    change: 2.5,
    volume: 1200000,
    marketCap: 2300000, // Roughly 17M tokens * 0.135 price
    holders: 15000,
  },
  {
    id: 'BLO/SOL', 
    name: 'Blocoin',
    icon: {
        src: "/splash-icon.png",
        alt: "Blocoin logo"
    },
    price: 12.50,
    change: -1.2,
    volume: 850000,
    marketCap: 1100000,
    holders: 8500,
  },
  {
    id: 'LUMA/SOL', 
    name: 'Luma',
    icon: {
        src: "/lu.png",
        alt: "Luma logo"
    },
    price: 45.78,
    change: 5.8,
    volume: 2500000,
    marketCap: 5800000,
    holders: 42000,
  },
  {
    id: 'BRICS/SOL', 
    name: 'Brics',
    icon: {
        src: "/br.png",
        alt: "Brics logo"
    },
    price: 1.01,
    change: 0.5,
    volume: 500000,
    marketCap: 750000,
    holders: 21000,
  },
];

type Candlestick = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Store chart data in memory
let priceChartData: Map<string, Candlestick[]> = new Map();
let lastGeneratedTime: Map<string, number> = new Map();

function generateCandlestickData(assetId: string, timeframeMinutes: number): Candlestick[] {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return [];

    const timeframeSeconds = timeframeMinutes * 60;
    const now = Math.floor(Date.now() / 1000);
    const data: Candlestick[] = [];
    
    // Start from 200 periods before the last generated time or now
    const startTime = (lastGeneratedTime.get(assetId) || now) - (200 * timeframeSeconds);

    let currentPrice = asset.price;
    let currentTime = Math.floor(startTime / timeframeSeconds) * timeframeSeconds;

    for (let i = 0; i < 200; i++) {
        const open = currentPrice;
        const close = open + (Math.random() - 0.5) * (open * 0.05); // 5% volatility
        const high = Math.max(open, close) + Math.random() * (open * 0.02);
        const low = Math.min(open, close) - Math.random() * (open * 0.02);

        data.push({ time: currentTime, open, high, low, close });

        currentPrice = close;
        currentTime += timeframeSeconds;
    }
    
    lastGeneratedTime.set(assetId, now);
    priceChartData.set(`${assetId}-${timeframeMinutes}`, data);
    return data;
}

type Order = {
    price: number;
    amount: number;
    total: number;
};

// Generates a more realistic order book based on CLAMM principles
function generateClammOrders(currentPrice: number, depth: number = 20): { bids: Order[], asks: Order[] } {
    const bids: Order[] = [];
    const asks: Order[] = [];
    
    // Concentrate liquidity around the current price
    for (let i = 1; i <= depth; i++) {
        const priceSpread = currentPrice * 0.005 * i; // Bids decrease, asks increase
        const amountJitter = Math.random() * 0.5 + 0.75; // 75% to 125% of base
        
        // Bids (people wanting to buy) are below current price
        const bidPrice = parseFloat((currentPrice - priceSpread).toFixed(4));
        const bidAmount = parseFloat(((depth - i + 1) * 5 * amountJitter).toFixed(2));
        bids.push({ price: bidPrice, amount: bidAmount, total: parseFloat((bidPrice * bidAmount).toFixed(2)) });

        // Asks (people wanting to sell) are above current price
        const askPrice = parseFloat((currentPrice + priceSpread).toFixed(4));
        const askAmount = parseFloat(((depth - i + 1) * 5 * amountJitter).toFixed(2));
        asks.push({ price: askPrice, amount: askAmount, total: parseFloat((askPrice * askAmount).toFixed(2)) });
    }
    return { bids, asks };
}


function getAssetData(assetId: string, timeframe: string) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return null;

    const timeframeMinutes = parseInt(timeframe);
    const chartKey = `${assetId}-${timeframeMinutes}`;
    
    if (!priceChartData.has(chartKey)) {
        generateCandlestickData(assetId, timeframeMinutes);
    }
    
    const chartDataForTimeframe = priceChartData.get(chartKey) || [];
    const orderBookData = generateClammOrders(asset.price);

    return {
        priceChart: chartDataForTimeframe,
        orderBook: orderBookData,
        tradeHistory: [], // Trade history will now be fetched from Firestore on the client
    };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const assetId = searchParams.get('assetId');
  const timeframe = searchParams.get('timeframe') || '5';

  if (type === 'assets') {
    return NextResponse.json(assets);
  }

  if (type === 'assetData' && assetId) {
    const data = getAssetData(assetId, timeframe);
    if (data) {
        return NextResponse.json(data);
    }
    return new Response('Asset not found', { status: 404 });
  }

  return new Response('Invalid request', { status: 400 });
}
