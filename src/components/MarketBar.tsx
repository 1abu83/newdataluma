
"use client";

import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/app/page';
import { Skeleton } from './ui/skeleton';


interface MarketBarProps {
  isOpen: boolean;
}

const formatValue = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toString();
};


export default function MarketBar({ isOpen }: MarketBarProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
        try {
            const response = await fetch('/api/market-data?type=assets');
            if (!response.ok) {
                throw new Error('Failed to fetch assets');
            }
            const data: Asset[] = await response.json();
            setAssets(data);
        } catch (error) {
            console.error(error);
        } finally {
            if (loading) setLoading(false);
        }
    };

    fetchAssets();
    const intervalId = setInterval(fetchAssets, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [loading]);

  return (
    <div
      className={cn(
        'border-b border-border/40 bg-background transition-all duration-300 ease-in-out overflow-hidden',
        isOpen ? 'max-h-96 py-4' : 'max-h-0'
      )}
    >
      <div className="container max-w-screen-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
             Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)
          ) : (
            assets.map((asset) => {
                const isUp = asset.change >= 0;
                return (
                    <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-full", isUp ? 'bg-success/10' : 'bg-destructive/10')}>
                        {isUp ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                        </div>
                        <div>
                        <div className="font-bold text-foreground">{asset.id}</div>
                        <div className="text-xs text-muted-foreground">
                            Vol: {formatValue(asset.volume)}
                        </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-semibold text-foreground">${asset.price.toFixed(4)}</div>
                        <div className={cn("text-xs", isUp ? 'text-success' : 'text-destructive')}>
                        {asset.change > 0 ? '+' : ''}{asset.change.toFixed(2)}%
                        </div>
                    </div>
                    </div>
                )
            })
          )}
        </div>
      </div>
    </div>
  );
}
