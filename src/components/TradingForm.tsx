
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MarketOrderForm from "./MarketOrderForm"
import LimitOrderForm from "./LimitOrderForm"
import StopLimitOrderForm from "./StopLimitOrderForm"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import { getAuth } from "firebase/auth"
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

interface Asset {
  id: string;
  name: string;
  price: number;
}

interface TradingFormProps {
  type: 'buy' | 'sell';
  selectedAsset: Asset;
  solBalance?: number;
  psngBalance?: number;
}

export default function TradingForm({ type, selectedAsset, solBalance, psngBalance }: TradingFormProps) {
  const assetName = selectedAsset.id.split('/')[0];
  const title = type === 'buy' ? `Buy ${assetName}` : `Sell ${assetName}`;
  const titleClass = type === 'buy' ? 'text-success' : 'text-destructive';
  const { publicKey } = useWallet();
  const { toast } = useToast();

  async function handleMarketOrder(amount: number) {
    if (!publicKey) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    try {
      const response = await fetch("https://swap-xtgnsf4tla-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: publicKey.toBase58(),
          direction: type, // 'buy' atau 'sell'
          amount: Number(amount),
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: `Market ${type === 'buy' ? 'Buy' : 'Sell'} Success`, description: `Transaction submitted successfully.` });
      } else {
        toast({ title: `Market ${type === 'buy' ? 'Buy' : 'Sell'} Failed`, description: data.error || "Unknown error" });
      }
    } catch (e: any) {
      toast({ title: `Market ${type === 'buy' ? 'Buy' : 'Sell'} Failed`, description: e.message || String(e) });
    }
  }

  async function handleLimitOrder(amount: number, price: number) {
     if (!publicKey) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    if (!price) {
        toast({ title: "Price required", description: "Please enter a price for the limit order." });
        return;
    }
    try {
      const response = await fetch("https://createlimitorder-xtgnsf4tla-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: publicKey.toBase58(),
          type: type, // 'buy' atau 'sell'
          amount: Number(amount),
          price: Number(price), 
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: `Limit ${type === 'buy' ? 'Buy' : 'Sell'} Order Created`, description: `Order placed successfully.` });
      } else {
        toast({ title: `Limit ${type === 'buy' ? 'Buy' : 'Sell'} Order Failed`, description: data.error || "Unknown error" });
      }
    } catch (e: any) {
      toast({ title: `Limit ${type === 'buy' ? 'Buy' : 'Sell'} Order Failed`, description: e.message || String(e) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={titleClass}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="limit" className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-xs h-auto">
            <TabsTrigger value="limit">Limit</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="stop-limit">Stop-Limit</TabsTrigger>
            <TabsTrigger value="trailing-stop" disabled>Trailing</TabsTrigger>
          </TabsList>
          <TabsContent value="limit" className="pt-4">
            <LimitOrderForm
              type={type}
              selectedAsset={selectedAsset}
              onSwap={handleLimitOrder}
              solBalance={solBalance}
              psngBalance={psngBalance}
            />
          </TabsContent>
          <TabsContent value="market" className="pt-4">
            <MarketOrderForm 
              type={type} 
              selectedAsset={selectedAsset} 
              onSwap={handleMarketOrder} 
              solBalance={solBalance} 
              psngBalance={psngBalance} 
            />
          </TabsContent>
          <TabsContent value="stop-limit" className="pt-4">
            <StopLimitOrderForm type={type} selectedAsset={selectedAsset} />
          </TabsContent>
          <TabsContent value="trailing-stop" className="pt-4">
            {/* Trailing Stop Form will go here */}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
