
"use client"

import { useState, useEffect } from "react";
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

type Order = {
  price: number;
  amount: number;
  total: number;
};

type OrderBookData = {
  bids: Order[];
  asks: Order[];
};


interface OrderBookProps {
    selectedAsset: Asset;
}

export default function OrderBook({ selectedAsset }: OrderBookProps) {
    const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!selectedAsset) return;

      let isMounted = true;
      const fetchOrderBook = async () => {
        try {
          const response = await fetch(`/api/market-data?type=assetData&assetId=${selectedAsset.id}`);
          if (!response.ok) {
            throw new Error('Failed to fetch order book data');
          }
          const data = await response.json();
          if (isMounted) {
            setOrderBookData(data.orderBook);
            if(loading) setLoading(false);
          }
        } catch (error) {
          console.error(error);
          if (isMounted && loading) setLoading(false);
        }
      };
      fetchOrderBook();
      // Hapus interval polling
      return () => {
        isMounted = false;
      };
    }, [selectedAsset]);

    if (loading || !orderBookData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Order Book</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[360px] w-full" />
                </CardContent>
            </Card>
        )
    }

    const { bids, asks } = orderBookData;
    const assetName = selectedAsset.id.split('/')[0];
    const currencyName = selectedAsset.id.split('/')[1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Book</CardTitle>
      </CardHeader>
      <CardContent className="h-[360px] overflow-y-auto [scrollbar-width:none]">
          <div className="grid grid-cols-1">
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left text-destructive">Price ({currencyName})</TableHead>
                      <TableHead className="text-right">Amount ({assetName})</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...asks].reverse().map((ask, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-left text-destructive font-medium">{ask.price.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{ask.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{ask.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-y my-2 py-2">
                 <h3 className="text-lg font-semibold text-center">{selectedAsset.price.toFixed(4)} {currencyName}</h3>
              </div>
              <div>
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead className="text-left text-success">Price ({currencyName})</TableHead>
                      <TableHead className="text-right">Amount ({assetName})</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-left text-success font-medium">{bid.price.toFixed(4)}</TableCell>
                        <TableCell className="text-right">{bid.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{bid.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </div>
      </CardContent>
    </Card>
  )
}
