
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

// Use a map to store data for different timeframes
let priceChartData: Map<string, Candlestick[]> = new Map();

function initializeChartData() {
    const now = Math.floor(Date.now() / 1000);
    const initialPrice = assets.find(a => a.id === 'PSNG/SOL')?.price || 0.135;

    ['1', '5', '15', '30', '60', '240', '1440'].forEach(tfString => {
        const timeframeMinutes = parseInt(tfString);
        const timeframeSeconds = timeframeMinutes * 60;
        const data: Candlestick[] = [];
        let currentPrice = initialPrice * (0.9 + Math.random() * 0.1); // Start slightly lower
        
        // Start from 200 candles ago
        let currentTime = now - (200 * timeframeSeconds);

        for (let i = 0; i < 200; i++) {
            const candleTime = Math.floor(currentTime / timeframeSeconds) * timeframeSeconds;
            const open = currentPrice;
            const fluctuation = (Math.random() - 0.49); // Base random fluctuation
            let close = open * (1 + fluctuation * 0.01);
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            
            data.push({ time: candleTime, open, high, low, close });
            
            currentPrice = close;
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

let lastSimulationTime = Date.now();
const SIMULATION_TICK_RATE = 1000; // 1 second

// --- Market Simulation Logic ---

function simulateMarketActivity() {
  const now = Date.now();
  const timeSinceLastRun = now - lastSimulationTime;
  if (timeSinceLastRun < SIMULATION_TICK_RATE) return;

  let psngAsset = assets.find(a => a.id === 'PSNG/SOL');
  if (!psngAsset) return;

  const initialPrice = priceChartData.get('5')?.[0]?.open ?? psngAsset.price;
  let lastClose = psngAsset.price;

  const ticksToSimulate = Math.floor(timeSinceLastRun / SIMULATION_TICK_RATE);
  
  // --- Start of Bullish Trend Logic ---
  const TARGET_PRICE = 0.25; // The price we want to trend towards
  // --- End of Bullish Trend Logic ---


  for (let i = 0; i < ticksToSimulate; i++) {
     if (Math.random() > 0.4) {
        const tradeType = Math.random() > 0.5 ? 'Buy' : 'Sell';
        
        // --- Modified Fluctuation Logic ---
        const priceDifference = TARGET_PRICE - lastClose;
        // The closer to the target, the weaker the upward pull. Max pull is 0.1
        const upwardDrift = Math.min(Math.max(priceDifference * 0.1, 0), 0.1); 
        // Base random fluctuation is now biased by the upwardDrift
        const randomFluctuation = (Math.random() - (0.5 - upwardDrift)) * 0.01;
        
        let newPrice = lastClose * (1 + randomFluctuation);
        newPrice = Math.max(0.01, newPrice); // Ensure price doesn't go to zero
        
        const amount = Math.random() * 2000 + 50; 
        const total = newPrice * amount;
        const tradeTime = new Date(lastSimulationTime + (i + 1) * SIMULATION_TICK_RATE);

        tradeHistoryData.unshift({
          date: tradeTime.toISOString(),
          pair: 'PSNG/SOL',
          type: tradeType,
          price: newPrice,
          amount: amount,
          total: total,
        });

        lastClose = newPrice;
     }

     const tickTime = lastSimulationTime + (i + 1) * SIMULATION_TICK_RATE;
     priceChartData.forEach((data, timeframeMinutes) => {
         updateChartData(data, parseInt(timeframeMinutes), tickTime, lastClose);
     });
  }
  
  psngAsset.price = lastClose;
  psngAsset.volume += tradeHistoryData.slice(0, ticksToSimulate).reduce((acc, trade) => acc + trade.total, 0);
  psngAsset.change = ((lastClose - initialPrice) / initialPrice) * 100;
  psngAsset.holders += Math.round((Math.random() - 0.5) * ticksToSimulate * 0.5); 
  
  if (tradeHistoryData.length > 50) {
    tradeHistoryData.length = 50;
  }

  orderBookData.bids = generateClammOrders(lastClose, 15, 'buy');
  orderBookData.asks = generateClammOrders(lastClose, 15, 'sell');

  lastSimulationTime = now;
}

function updateChartData(data: Candlestick[], timeframeMinutes: number, time: number, price: number) {
    const timeframeSeconds = timeframeMinutes * 60;
    const candleTime = Math.floor(time / 1000 / timeframeSeconds) * timeframeSeconds;

    if (data.length === 0) {
        data.push({ time: candleTime, open: price, high: price, low: price, close: price });
        return;
    }

    let lastCandle = data[data.length - 1];

    if (lastCandle.time === candleTime) {
        lastCandle.close = price;
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
    } else {
        const previousCandleTime = lastCandle.time;
        let nextCandleTime = previousCandleTime + timeframeSeconds;
        
        while(nextCandleTime < candleTime) {
            data.push({
                time: nextCandleTime,
                open: lastCandle.close,
                high: lastCandle.close,
                low: lastCandle.close,
                close: lastCandle.close,
            });
            lastCandle = data[data.length - 1]; 
            nextCandleTime += timeframeSeconds;
        }

        data.push({
            time: candleTime,
            open: lastCandle.close,
            high: price,
            low: price,
            close: price,
        });
    }

    if (data.length > 200) {
        data.shift();
    }
}


function generateClammOrders(basePrice: number, count: number, type: 'buy' | 'sell') {
    let orders = [];
    let currentPrice = basePrice;
    const concentrationFactor = 0.4;

    for (let i = 0; i < count; i++) {
        const priceGapMultiplier = 1 + i * 0.1;
        const priceChange = (Math.random() * 0.001) * priceGapMultiplier;

        currentPrice = type === 'buy' 
            ? currentPrice * (1 - priceChange) 
            : currentPrice * (1 + priceChange);

        const liquidityDecay = Math.exp(-concentrationFactor * i);
        const baseAmount = 8000;
        const amount = (baseAmount * liquidityDecay) * (0.8 + Math.random() * 0.4);

        orders.push({
            price: currentPrice,
            amount,
            total: currentPrice * amount,
        });
    }
    return orders;
}

function getAssetData(assetId: string, timeframe: string) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
        return null;
    }
    
    simulateMarketActivity();
    
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

  simulateMarketActivity();

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
