
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
import { app } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";

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
  const [solBalance, setSolBalance] = useState<number | undefined>(undefined);
  const [psngBalance, setPsngBalance] = useState<number | undefined>(undefined);

  const wallet = useWallet();
  const { publicKey } = wallet;

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
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("Firebase user logged in:", firebaseUser.uid);
      } else {
        setUser(null);
        setSolBalance(undefined);
        setPsngBalance(undefined);
        console.log("Firebase user logged out.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Centralized balance listener
  useEffect(() => {
    if (user && publicKey) {
      const db = getFirestore(app);
      const solBalanceRef = doc(db, "users", publicKey.toBase58(), "balances", "SOL");
      const psngBalanceRef = doc(db, "users", publicKey.toBase58(), "balances", "PSNG");

      const unsubSol = onSnapshot(solBalanceRef, (doc) => {
        setSolBalance(doc.exists() ? doc.data().amount : 0);
      });
      const unsubPsng = onSnapshot(psngBalanceRef, (doc) => {
        setPsngBalance(doc.exists() ? doc.data().amount : 0);
      });

      return () => {
        unsubSol();
        unsubPsng();
      };
    }
  }, [user, publicKey]);


  useEffect(() => {
    // When the selected asset changes, clear the markers from the previous asset.
    setTradeMarkers([]);
  }, [selectedAsset]);


  // Fetch swap/trade data from Firestore in real-time
  useEffect(() => {
    const db = getFirestore(app);
    const swapsQuery = query(
      collection(db, "swaps"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(swapsQuery, (snapshot) => {
      const swaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Map to trade history format
      const history = swaps.map(s => {
        const price = s.amountIn > 0 ? s.amountOut / s.amountIn : 0;
        return {
          date: new Date(s.timestamp || Date.now()).toISOString(),
          pair: 'PSNG/SOL',
          type: s.direction === 'buy' ? 'Buy' : 'Sell',
          price: price,
          amount: s.direction === 'buy' ? s.amountOut : s.amountIn,
          total: s.direction === 'buy' ? s.amountIn : s.amountOut,
        };
      });
      setTradeHistory(history);

      // Map to trade markers for the chart
      const markers = swaps
        .filter(s => s.direction && s.amountIn > 0)
        .map(s => ({
          time: Math.floor((s.timestamp || Date.now()) / 1000),
          price: s.amountOut / s.amountIn,
          type: s.direction as 'buy' | 'sell',
        }));
      setTradeMarkers(markers);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
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
              <TradingForm 
                type="buy" 
                selectedAsset={selectedAsset} 
                onTrade={handleNewTrade} 
                solBalance={solBalance}
                psngBalance={psngBalance}
              />
              <TradingForm 
                type="sell" 
                selectedAsset={selectedAsset} 
                onTrade={handleNewTrade}
                solBalance={solBalance}
                psngBalance={psngBalance}
              />
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

    