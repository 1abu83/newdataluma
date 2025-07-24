
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
import { app } from '@/lib/firebase'; // Import app to ensure initialization

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

  useEffect(() => {
    // Mock assets data since the API is removed.
    const mockAssets = [
      { 
        id: 'PSNG/SOL', 
        name: 'Pasino',
        icon: { src: "/psng.png", alt: "Pasino logo" },
        price: 0.135,
        change: 2.5,
        volume: 1200000,
        marketCap: 2300000,
        holders: 15000,
      },
      {
        id: 'LUMA/SOL', 
        name: 'Luma',
        icon: { src: "/lu.png", alt: "Luma logo" },
        price: 45.78,
        change: 5.8,
        volume: 2500000,
        marketCap: 5800000,
        holders: 42000,
      },
    ];
    setAssets(mockAssets);
    setSelectedAsset(mockAssets[0]);
    setLoading(false);
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
            const date = s.timestamp instanceof Timestamp ? s.timestamp.toDate() : new Date(s.timestamp);
            
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
