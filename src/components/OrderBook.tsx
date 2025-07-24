
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
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';


type Order = {
  price: number;
  amount: number;
  total: number;
};

interface OrderBookProps {
    selectedAsset: Asset;
}

export default function OrderBook({ selectedAsset }: OrderBookProps) {
    const [bids, setBids] = useState<Order[]>([]);
    const [asks, setAsks] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!selectedAsset) return;
      setLoading(true);
      
      const db = getFirestore();
      
      // Listener for Bids (Buy orders)
      const bidsQuery = query(
        collection(db, 'orders'), 
        where('type', '==', 'buy'),
        // orderBy('price', 'desc'), // This requires a composite index. Sorting will be done on the client.
        limit(50)
      );
      const bidsUnsub = onSnapshot(bidsQuery, (snapshot) => {
        const bidsData = snapshot.docs.map(doc => doc.data() as Order);
        // Sort on the client side
        bidsData.sort((a, b) => b.price - a.price);
        setBids(bidsData.slice(0, 20));
        if(loading) setLoading(false);
      });

      // Listener for Asks (Sell orders)
      const asksQuery = query(
        collection(db, 'orders'), 
        where('type', '==', 'sell'),
        // orderBy('price', 'asc'), // This requires a composite index. Sorting will be done on the client.
        limit(50)
      );
      const asksUnsub = onSnapshot(asksQuery, (snapshot) => {
        const asksData = snapshot.docs.map(doc => doc.data() as Order);
        // Sort on the client side
        asksData.sort((a, b) => a.price - b.price);
        setAsks(asksData.slice(0, 20));
        if(loading) setLoading(false);
      });

      return () => {
        bidsUnsub();
        asksUnsub();
      };
    }, [selectedAsset]);

    if (loading) {
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
                    {asks.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center h-24">No sell orders</TableCell></TableRow>
                    )}
                    {[...asks].reverse().map((ask, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-left text-destructive font-medium">{ask.price.toFixed(8)}</TableCell>
                        <TableCell className="text-right">{ask.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{(ask.price * ask.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-y my-2 py-2">
                 <h3 className="text-lg font-semibold text-center text-success">{selectedAsset.price.toFixed(8)} {currencyName}</h3>
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
                    {bids.length === 0 && (
                       <TableRow><TableCell colSpan={3} className="text-center h-24">No buy orders</TableCell></TableRow>
                    )}
                    {bids.map((bid, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-left text-success font-medium">{bid.price.toFixed(8)}</TableCell>
                        <TableCell className="text-right">{bid.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{(bid.price * bid.amount).toFixed(2)}</TableCell>
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
