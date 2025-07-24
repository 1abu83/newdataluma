
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
      if (!selectedAsset?.id) return;
      
      // Only set loading to true when the asset ID actually changes
      setLoading(true); 
      
      const db = getFirestore();
      
      // Listener for Bids (Buy orders)
      const bidsQuery = query(
        collection(db, 'orders'), 
        where('type', '==', 'buy'),
        // where('assetId', '==', selectedAsset.id) // This would be ideal with a composite index
        limit(50)
      );
      const bidsUnsub = onSnapshot(bidsQuery, (snapshot) => {
        const bidsData = snapshot.docs.map(doc => doc.data() as Order);
        bidsData.sort((a, b) => b.price - a.price);
        setBids(bidsData.slice(0, 20));
        setLoading(false); // Stop loading after first fetch
      }, (error) => {
        console.error("Error fetching bids:", error);
        setLoading(false);
      });

      // Listener for Asks (Sell orders)
      const asksQuery = query(
        collection(db, 'orders'), 
        where('type', '==', 'sell'),
        // where('assetId', '==', selectedAsset.id)
        limit(50)
      );
      const asksUnsub = onSnapshot(asksQuery, (snapshot) => {
        const asksData = snapshot.docs.map(doc => doc.data() as Order);
        asksData.sort((a, b) => a.price - b.price);
        setAsks(asksData.slice(0, 20));
        setLoading(false); // Stop loading after first fetch
      }, (error) => {
        console.error("Error fetching asks:", error);
        setLoading(false);
      });

      return () => {
        bidsUnsub();
        asksUnsub();
      };
    // The key change: Depend only on the asset's ID, not the whole object.
    // This prevents re-fetching data every time the price changes.
    }, [selectedAsset?.id]); 

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
