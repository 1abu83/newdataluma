
import { cn } from "@/lib/utils";
import React from "react";
import Image from "next/image";

const SolanaLogo = ({ className }: { className?: string }) => (
  <Image
    src="/sol.png"
    alt="Solana logo"
    width={24}
    height={24}
    className={cn(className)}
    data-ai-hint="logo solana"
  />
);

export default SolanaLogo;
