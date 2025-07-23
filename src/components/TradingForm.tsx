
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className={titleClass}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="market" className="w-full">
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
              solBalance={solBalance}
              psngBalance={psngBalance}
            />
          </TabsContent>
          <TabsContent value="market" className="pt-4">
            <MarketOrderForm 
              type={type} 
              selectedAsset={selectedAsset} 
              solBalance={solBalance} 
              psngBalance={psngBalance}
            />
          </TabsContent>
          <TabsContent value="stop-limit" className="pt-4">
            <StopLimitOrderForm 
              type={type} 
              selectedAsset={selectedAsset} 
              solBalance={solBalance} 
              psngBalance={psngBalance} 
            />
          </TabsContent>
          <TabsContent value="trailing-stop" className="pt-4">
            {/* Trailing Stop Form will go here */}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
