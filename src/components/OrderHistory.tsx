
"use client"

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Asset } from "@/app/page";
import { Skeleton } from "./ui/skeleton";

type Trade = {
  date: string;
  pair: string;
  type: 'Buy' | 'Sell';
  price: number;
  amount: number;
  total: number;
};

interface OrderHistoryProps {
    selectedAsset: Asset;
}

export default function OrderHistory({ selectedAsset }: OrderHistoryProps) {
    const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedAsset) return;
        
        let isMounted = true;
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/market-data?type=assetData&assetId=${selectedAsset.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch trade history');
                }
                const data = await response.json();
                if (isMounted) {
                    setTradeHistory(data.tradeHistory);
                    if (loading) setLoading(false);
                }
            } catch (error) {
                console.error(error);
                if(isMounted && loading) setLoading(false);
            }
        }, 2000); // Fetch every 2 seconds

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        }

    }, [selectedAsset, loading]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Trade History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>
        )
    }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px] overflow-y-auto [scrollbar-width:none]">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Time</TableHead>
                <TableHead className="w-1/4 text-center">Type</TableHead>
                <TableHead className="w-1/4 text-right">Price (SOL)</TableHead>
                <TableHead className="w-1/4 text-right">Amount (PSNG)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradeHistory.map((trade, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground text-xs truncate">{new Date(trade.date).toLocaleTimeString()}</TableCell>
                   <TableCell className="text-center">
                    <span className={trade.type === 'Buy' ? 'text-success' : 'text-destructive'}>
                      {trade.type}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right truncate ${trade.type === 'Buy' ? 'text-success' : 'text-destructive'}`}>{trade.price.toFixed(4)}</TableCell>
                  <TableCell className="text-right truncate">{trade.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </CardContent>
    </Card>
  )
}
