'use client';

import React, { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

const CustomWalletButton = () => {
  const { connected } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Override the wallet button text for mobile
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        @media (max-width: 768px) {
          /* Menyembunyikan teks "Select Wallet" sepenuhnya */
          .wallet-adapter-button-trigger > span {
            font-size: 0 !important;
            visibility: hidden !important;
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            position: absolute !important;
            overflow: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            clip: rect(0, 0, 0, 0) !important;
            margin: -1px !important;
            padding: 0 !important;
            border: 0 !important;
          }
          
          /* Menampilkan teks "Connect" sebagai gantinya */
          .wallet-adapter-button-trigger::before {
            content: 'Connect';
            font-size: 0.75rem;
            display: inline-block !important;
            visibility: visible !important;
            position: relative !important;
            z-index: 10 !important;
          }
          
          /* Menyembunyikan ikon profil pada perangkat mobile */
          .wallet-adapter-button-trigger img {
            display: none !important;
          }
          
          /* Mengurangi padding untuk tombol yang lebih kompak */
          .wallet-adapter-button-trigger {
            padding: 0 8px !important;
            min-width: 0 !important;
            height: 32px !important;
            overflow: hidden !important;
            position: relative !important;
          }
          
          /* Menyembunyikan semua konten asli di dalam tombol */
          .wallet-adapter-button-trigger * {
            opacity: 0 !important;
            visibility: hidden !important;
          }
          
          /* Kecuali untuk pseudo-element ::before yang menampilkan "Connect" */
          .wallet-adapter-button-trigger::before {
            opacity: 1 !important;
            visibility: visible !important;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  if (!isClient) return null;

  return <WalletMultiButton />;
};

export default CustomWalletButton;