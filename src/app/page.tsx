
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PriceChart, { TradeMarker } from '@/components/PriceChart';
import TradingForm from '@/components/TradingForm';
import OrderBook from '@/components/OrderBook';
import OrderHistory from '@/components/OrderHistory';
import MarketBar from '@/components/MarketBar';
import AssetInfoBar from '@/components/AssetInfoBar';
import BottomBar from '@/components/BottomBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import DrawingToolbar from '@/components/DrawingToolbar';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { fetchRecentSwaps } from '@/lib/firebase';


export interface Asset {
  id: string;
  name: string;
  icon: {
    src: string;
    alt: string;
  };
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  holders: number;
}


export default function Home() {
  const [isMarketBarOpen, setMarketBarOpen] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { publicKey } = useWallet();

  // Centralized balance state
  const [solBalance, setSolBalance] = useState<number | undefined>(undefined);
  const [psngBalance, setPsngBalance] = useState<number | undefined>(undefined);

  const handleNewTrade = (price: number, type: 'buy' | 'sell') => {
    const newMarker: TradeMarker = {
      time: Math.floor(Date.now() / 1000),
      price: price,
      type: type,
    };
    setTradeMarkers(prevMarkers => [...prevMarkers, newMarker]);
  };


  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true);
        const response = await fetch('/api/market-data?type=assets');
        if (!response.ok) {
          throw new Error('Failed to fetch assets');
        }
        const data: Asset[] = await response.json();
        setAssets(data);
        if (data.length > 0) {
          setSelectedAsset(data[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Real-time balance listener
  useEffect(() => {
    if (publicKey) {
      const db = getFirestore();
      
      const solBalanceUnsub = onSnapshot(
        doc(db, "users", publicKey.toBase58(), "balances", "SOL"),
        (doc) => setSolBalance(doc.exists() ? doc.data().amount : 0)
      );

      const psngBalanceUnsub = onSnapshot(
        doc(db, "users", publicKey.toBase58(), "balances", "PSNG"),
        (doc) => setPsngBalance(doc.exists() ? doc.data().amount : 0)
      );

      return () => {
        solBalanceUnsub();
        psngBalanceUnsub();
      };
    } else {
      setSolBalance(undefined);
      setPsngBalance(undefined);
    }
  }, [publicKey]);


  useEffect(() => {
    // When the selected asset changes, clear the markers from the previous asset.
    setTradeMarkers([]);
  }, [selectedAsset]);


  // Fetch swap/trade data from Firestore
  useEffect(() => {
    async function fetchSwaps() {
      const swaps = await fetchRecentSwaps(50);
      const filtered = swaps.filter(s => s.direction && (s.direction === 'buy' || s.direction === 'sell'));
      filtered.reverse(); // ASCENDING by time
      
      const processTimestamp = (timestamp: any): number => {
        if (!timestamp) return Date.now();
        // Firestore timestamp object has toDate() method
        if (typeof timestamp.toDate === 'function') {
          return timestamp.toDate().getTime();
        }
        // Handle numeric timestamp (milliseconds)
        if (typeof timestamp === 'number') {
          return timestamp;
        }
        // Fallback for string or other types, though less ideal
        const parsed = Date.parse(timestamp);
        return isNaN(parsed) ? Date.now() : parsed;
      };

      // For chart markers
      setTradeMarkers(filtered.map(s => ({
        time: Math.floor(processTimestamp(s.timestamp) / 1000),
        price: s.direction === 'buy' ? (s.amountIn / (s.amountOut || 1)) : (s.amountOut / (s.amountIn || 1)),
        type: s.direction
      })));

      // For order history
      setTradeHistory(filtered.map(s => ({
        date: new Date(processTimestamp(s.timestamp)).toISOString(),
        pair: 'PSNG/SOL',
        type: s.direction === 'buy' ? 'Buy' : 'Sell',
        price: s.direction === 'buy' ? (s.amountIn / (s.amountOut || 1)) : (s.amountOut / (s.amountIn || 1)),
        amount: s.direction === 'buy' ? (s.amountOut || 0) : (s.amountIn || 0),
        total: s.amountIn || 0
      })));
    }
    
    const db = getFirestore();
    const swapsQuery = query(collection(db, "swaps"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(swapsQuery, (snapshot) => {
        fetchSwaps(); // Re-fetch whenever swaps collection changes
    });

    return () => unsubscribe();
  }, []);


  if (loading || !selectedAsset) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header 
          isMarketBarOpen={isMarketBarOpen} 
          onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)} 
          onDepositClick={() => setWalletSetupOpen(true)}
        />
        <div className="container mx-auto max-w-screen-2xl p-4">
           <Skeleton className="h-20 w-full mb-4" />
           <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <Skeleton className="h-[400px] w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-6">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WalletSetupDialog 
        isOpen={isWalletSetupOpen} 
        onOpenChange={setWalletSetupOpen}
        solBalance={solBalance}
        psngBalance={psngBalance} 
      />
      <Header 
        isMarketBarOpen={isMarketBarOpen} 
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        onDepositClick={() => setWalletSetupOpen(true)}
      />
      <div className="flex-1 pb-20 md:pb-0">
        <MarketBar isOpen={isMarketBarOpen} />
        <AssetInfoBar 
          assets={assets}
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
          onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        />
        <main className="container mx-auto max-w-screen-2xl px-0 md:px-6 lg:px-8">
          <div className="mt-6 flex items-stretch">
            <div className="hidden md:flex items-center pr-2">
              <DrawingToolbar />
            </div>
            <div className="flex-1">
              <PriceChart selectedAsset={selectedAsset} tradeMarkers={tradeMarkers} />
            </div>
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-5 mt-6 px-4 md:px-0">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <TradingForm type="buy" selectedAsset={selectedAsset} onTrade={handleNewTrade} solBalance={solBalance} psngBalance={psngBalance} />
              <TradingForm type="sell" selectedAsset={selectedAsset} onTrade={handleNewTrade} solBalance={solBalance} psngBalance={psngBalance} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
              <OrderBook selectedAsset={selectedAsset} />
              <OrderHistory selectedAsset={selectedAsset} tradeHistory={tradeHistory} />
            </div>
          </div>
        </main>
      </div>
      <BottomBar />
    </div>
  );
}
