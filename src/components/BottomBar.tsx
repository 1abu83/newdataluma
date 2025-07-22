"use client";

import { LayoutGrid, CandlestickChart, Repeat, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '#', icon: LayoutGrid, label: 'Dashboard' },
  { href: '#', icon: CandlestickChart, label: 'Markets', active: true },
  { href: '#', icon: Repeat, label: 'Trade' },
  { href: '#', label: 'Wallet', icon: Wallet },
];

export default function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border/40 md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5 mb-1", item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="text-xs">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
