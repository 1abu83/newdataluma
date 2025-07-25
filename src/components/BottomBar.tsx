

"use client";

import { LayoutGrid, CandlestickChart, Repeat, Rocket, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/market', icon: TrendingUp, label: 'Market' },
  { href: '/trade', icon: CandlestickChart, label: 'Futures', active: true },
  { href: '/launchpad', label: 'Launchpad', icon: Rocket },
];

export default function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border/40 md:hidden">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5 mb-1", item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="text-xs">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
