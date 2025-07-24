
"use client";

import { ChevronDown, DollarSign, Users, Activity, Briefcase, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import SolanaLogo from './SolanaLogo';
import type { Asset } from '@/app/page';

interface AssetInfoBarProps {
  assets: Asset[];
  selectedAsset: Asset;
  onAssetChange: (asset: Asset) => void;
  onMarketToggle?: () => void;
}

export default function AssetInfoBar({ assets, selectedAsset, onAssetChange, onMarketToggle }: AssetInfoBarProps) {
  const formatMarketCap = (cap: number) => {
    if (cap >= 1_000_000_000) {
      return `$${(cap / 1_000_000_000).toFixed(1)}B`;
    }
    if (cap >= 1_000_000) {
      return `$${(cap / 1_000_000).toFixed(1)}M`;
    }
    if (cap >= 1_000) {
      return `$${(cap / 1_000).toFixed(1)}K`;
    }
    return `$${cap}`;
  }
  
  return (
    <div className="border-b border-t border-border/40 bg-muted/20">
      <div className="container mx-auto max-w-screen-2xl px-2 md:px-6 lg:px-8">
        <div className="h-20 flex items-center">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 md:gap-4 text-base font-bold p-2 h-auto">
                    <div className="flex items-center gap-2">
                       <Image src={selectedAsset.icon.src} alt={selectedAsset.icon.alt} width={32} height={32} className="h-8 w-8" data-ai-hint="logo" />
                       <span className="text-muted-foreground/50">/</span>
                       <SolanaLogo className="h-6 w-6" />
                    </div>
                    <span className="hidden sm:inline-block">{selectedAsset.id}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {assets.map((asset) => (
                    <DropdownMenuItem key={asset.id} onSelect={() => onAssetChange(asset)}>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                           <Image src={asset.icon.src} alt={asset.icon.alt} width={24} height={24} data-ai-hint="logo" />
                           <span className="text-muted-foreground/50">/</span>
                           <SolanaLogo className="h-4 w-4" />
                        </div>
                        <span>{asset.name} ({asset.id})</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="md:hidden ml-auto flex items-center gap-2">
               {onMarketToggle && (
                <Button variant="ghost" size="icon" onClick={onMarketToggle} className="h-8 w-8">
                  <TrendingUp className="h-5 w-5" />
                </Button>
              )}
              <InfoBlock 
                label="Price"
                value={`${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8})} SOL`}
                change={selectedAsset.change}
              />
            </div>

            <div className="hidden md:flex items-center h-full ml-auto">
              <InfoBlock 
                icon={<DollarSign className="text-foreground" />} 
                label="Price"
                value={`${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8})} SOL`}
                change={selectedAsset.change}
              />
              <Separator orientation="vertical" className="h-1/2" />
              <InfoBlock 
                icon={<Activity className="text-muted-foreground" />} 
                label="24h Change"
                value={`${selectedAsset.change > 0 ? '+' : ''}${selectedAsset.change.toFixed(2)}%`}
                isChange={true}
                change={selectedAsset.change}
              />
              <Separator orientation="vertical" className="h-1/2" />
              <InfoBlock 
                icon={<Briefcase className="text-muted-foreground" />} 
                label="Volume (24h)"
                value={selectedAsset.volume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              />
              <Separator orientation="vertical" className="h-1/2" />
              <InfoBlock 
                icon={<Briefcase className="text-muted-foreground" />} 
                label="Market Cap"
                value={formatMarketCap(selectedAsset.marketCap)}
              />
              <Separator orientation="vertical" className="h-1/2" />
              <InfoBlock 
                icon={<Users className="text-muted-foreground" />} 
                label="Holders"
                value={selectedAsset.holders.toLocaleString()}
              />
            </div>
        </div>
      </div>
    </div>
  );
}

interface InfoBlockProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  isChange?: boolean;
}

function InfoBlock({ icon, label, value, change, isChange = false }: InfoBlockProps) {
  const changeColor = change && change > 0 ? 'text-success' : 'text-destructive';
  
  return (
    <div className="flex items-center gap-3 px-3 md:px-6 h-full">
      {icon && <div className="h-5 w-5 hidden md:flex items-center justify-center">{icon}</div>}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm font-semibold ${isChange ? changeColor : 'text-foreground'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}
