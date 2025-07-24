
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PriceChart from '@/components/PriceChart';
import TradingForm from '@/components/TradingForm';
import OrderBook from '@/components/OrderBook';
import OrderHistory from '@/components/OrderHistory';
import MarketBar from '@/components/MarketBar';
import AssetInfoBar from '@/components/AssetInfoBar';
import BottomBar from '@/components/BottomBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';
import DrawingToolbar from '@/components/DrawingToolbar';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { app, rtdb } from '@/lib/firebase'; // Import app and rtdb
import { ref as dbRef, onValue, off } from "firebase/database";


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
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { publicKey } = useWallet();

  // Centralized balance state
  const [solBalance, setSolBalance] = useState<number | undefined>(undefined);
  const [psngBalance, setPsngBalance] = useState<number | undefined>(undefined);

  // Set initial asset data without price, change, or volume
  useEffect(() => {
    const initialAssets = [
      { 
        id: 'PSNG/SOL', 
        name: 'Pasino',
        icon: { src: "/psng.png", alt: "Pasino logo" },
        price: 0, 
        change: 0, // Will be updated by the listener
        volume: 0, // Will be updated by the listener
        marketCap: 2300000, // Mock data
        holders: 15000, // Mock data
      },
      {
        id: 'LUMA/SOL', 
        name: 'Luma',
        icon: { src: "/lu.png", alt: "Luma logo" },
        price: 45.78, // Mock data
        change: 5.8,
        volume: 2500000,
        marketCap: 5800000,
        holders: 42000,
      },
    ];
    setAssets(initialAssets);
    setSelectedAsset(initialAssets[0]);
  }, []);

  // Real-time listener for price, volume, and change from Realtime Database
  useEffect(() => {
    const chartRefRtdb = dbRef(rtdb, `charts/SOLPSNG`);
    let unsubscribed = false;

    const handleValue = (snapshot: any) => {
      if (unsubscribed) return;
      const val = snapshot.val();
      if (val) {
        // Sort candles by timestamp to ensure correct order
        const allCandles = Object.entries(val)
            .map(([timestamp, d]: [string, any]) => ({...d, timestamp: Number(timestamp)}))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (allCandles.length > 0) {
            const latestCandle = allCandles[allCandles.length - 1];
            const newPrice = latestCandle.close;

            // --- Calculate 24h Volume ---
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentCandles = allCandles.filter(c => c.timestamp >= oneDayAgo);
            const volume24h = recentCandles.reduce((sum, candle) => sum + (candle.volume || 0), 0);

            // --- Calculate 24h Change ---
            let change24h = 0;
            const candle24hAgo = allCandles.find(c => c.timestamp >= oneDayAgo);

            if (candle24hAgo && candle24hAgo.open > 0) {
                const price24hAgo = candle24hAgo.open;
                change24h = ((newPrice - price24hAgo) / price24hAgo) * 100;
            }

            const updateAsset = (prev: Asset | null) => {
                if (prev) {
                    return { ...prev, price: newPrice, volume: volume24h, change: change24h };
                }
                return null;
            }

            setSelectedAsset(updateAsset);

            setAssets(prevAssets => {
                return prevAssets.map(asset => 
                    asset.id === 'PSNG/SOL' ? { ...asset, price: newPrice, volume: volume24h, change: change24h } : asset
                );
            });
        }
      }
      setLoading(false); 
    };
    
    onValue(chartRefRtdb, handleValue, (error) => {
        console.error("Error fetching data from RTDB:", error);
        setLoading(false);
    });

    return () => {
        unsubscribed = true;
        off(chartRefRtdb, 'value', handleValue);
    };
  }, []);


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setWalletSetupOpen(false); // Close dialog on successful login
      }
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

  // Fetch swap/trade data from Firestore using a real-time listener
  useEffect(() => {
    const db = getFirestore();
    const swapsQuery = query(collection(db, "swaps"), orderBy("timestamp", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(swapsQuery, (snapshot) => {
        const history = snapshot.docs
          .filter(doc => !doc.metadata.hasPendingWrites && doc.data().timestamp)
          .map(sDoc => {
            const s = sDoc.data();
            // Firestore timestamps need to be converted to JS Date objects
            const date = s.timestamp instanceof Timestamp ? s.timestamp.toDate() : new Date(s.timestamp || Date.now());
            
            const price = s.exchangeRate 
                        ? parseFloat(s.exchangeRate) 
                        : (s.direction === 'buy' ? (s.amountIn / s.amountOut) : (s.amountOut / s.amountIn));
            const amount = s.direction === 'buy' ? s.amountOut : s.amountIn;
  
            return {
              date: date.toISOString(),
              pair: 'PSNG/SOL',
              type: s.direction === 'buy' ? 'Buy' : 'Sell',
              price: isNaN(price) ? 0 : price,
              amount: amount,
              total: s.amountIn,
            };
        });
        
        setTradeHistory(history);
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
          onWithdrawClick={() => setWalletWithdrawOpen(true)}
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
      />
      <WalletWithdrawDialog
        isOpen={isWalletWithdrawOpen}
        onOpenChange={setWalletWithdrawOpen}
      />
      <Header 
        isMarketBarOpen={isMarketBarOpen} 
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        onDepositClick={() => setWalletSetupOpen(true)}
        onWithdrawClick={() => setWalletWithdrawOpen(true)}
      />
      <div className="flex-1 pb-20 md:pb-0">
        <MarketBar isOpen={isMarketBarOpen} assets={assets} />
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
              <PriceChart />
            </div>
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-5 mt-6 px-4 md:px-0">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <TradingForm type="buy" selectedAsset={selectedAsset} solBalance={solBalance} psngBalance={psngBalance} />
              <TradingForm type="sell" selectedAsset={selectedAsset} solBalance={solBalance} psngBalance={psngBalance} />
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

