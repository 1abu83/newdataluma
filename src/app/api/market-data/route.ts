
import { NextResponse } from 'next/server';

// Initial state for our assets
let assets = [
  { 
    id: 'PSNG/SOL', 
    name: 'Psng',
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

// Data chart statis (tidak ada simulasi/bot)
let priceChartData: Map<string, Candlestick[]> = new Map();

function initializeChartData() {
    const now = Math.floor(Date.now() / 1000);
    const initialPrice = assets.find(a => a.id === 'PSNG/SOL')?.price || 0.135;
    ['1', '5', '15', '30', '60', '240', '1440'].forEach(tfString => {
        const timeframeMinutes = parseInt(tfString);
        const timeframeSeconds = timeframeMinutes * 60;
        const data: Candlestick[] = [];
        let currentPrice = initialPrice;
        let currentTime = now - (200 * timeframeSeconds);
        for (let i = 0; i < 200; i++) {
            const candleTime = Math.floor(currentTime / timeframeSeconds) * timeframeSeconds;
            data.push({ time: candleTime, open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice });
            currentTime += timeframeSeconds;
        }
        priceChartData.set(tfString, data);
    });
}

let orderBookData: { bids: any[]; asks: any[] } = {
  bids: [],
  asks: [],
};

let tradeHistoryData: any[] = [];

function getAssetData(assetId: string, timeframe: string) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
        return null;
    }
    // Tidak ada simulasi market, hanya data statis
    const chartDataForTimeframe = priceChartData.get(timeframe) || [];
    return {
        priceChart: chartDataForTimeframe,
        orderBook: orderBookData,
        tradeHistory: tradeHistoryData,
    };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const assetId = searchParams.get('assetId');
  const timeframe = searchParams.get('timeframe') || '5';

  if (priceChartData.size === 0) {
    initializeChartData();
  }

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
