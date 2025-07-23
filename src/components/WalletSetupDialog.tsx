
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, onSnapshot, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

const GENERATE_CHALLENGE_URL = "https://generatechallenge-xtgnsf4tla-uc.a.run.app";
const VERIFY_SIGNATURE_URL = "https://verifysignatureandlogin-xtgnsf4tla-uc.a.run.app";


interface WalletSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  solBalance: number | undefined;
  psngBalance: number | undefined;
}

export default function WalletSetupDialog({ isOpen, onOpenChange, solBalance, psngBalance }: WalletSetupDialogProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [depositWallet, setDepositWallet] = useState<string>("");
  const [psngDepositWallet, setPsngDepositWallet] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (user) {
         fetchDepositAddress(user.uid);
      } else {
        setDepositWallet("");
        setPsngDepositWallet("");
      }
    });
    return () => unsubscribe();
  }, [auth]);

  async function fetchDepositAddress(userId: string) {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDepositWallet(userData.depositWallet || "N/A");
        setPsngDepositWallet(userData.depositWallet || "N/A"); // Demo: using same wallet
      }
    } catch (e) {
      console.error("Error fetching deposit address:", e);
    }
  }

  const handleCopyAddress = (address: string, token: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: `${token} Address Copied!`,
      description: `The ${token} deposit address has been copied to your clipboard.`,
    });
  };

  const handleLoginWithWallet = async () => {
    if (!publicKey || !signMessage) {
      toast({ title: "Wallet not connected or signMessage not available", description: "Please connect your wallet first." });
      return;
    }
    setLoading(true);
    try {
      // 1. Get challenge
      const challengeResponse = await fetch(GENERATE_CHALLENGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() })
      });
      const { challenge } = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error("Failed to get challenge");

      // 2. Sign challenge
      const message = new TextEncoder().encode(challenge);
      const signatureBytes = await signMessage(message);
      
      // Convert signature to Base58
      const { default: bs58 } = await import('bs58');
      const signature = bs58.encode(signatureBytes);

      // 3. Verify signature and login
      const verifyResponse = await fetch(VERIFY_SIGNATURE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress: publicKey.toBase58(),
          signature,
          challenge
        }),
      });

      const data = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(data.error || "Failed to verify signature");

      // 4. Sign in with custom token
      await signInWithCustomToken(auth, data.customToken);
      
      setDepositWallet(data.user.depositWallet || "");
      setPsngDepositWallet(data.user.depositWallet || "");
      toast({ title: "Login Success", description: "Wallet authenticated and deposit address loaded." });

    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Login Failed", description: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {isLoggedIn ? (
              <>Select the token you wish to deposit. Send funds only to the corresponding address.</>
            ) : (
              <>You must login/register with your wallet to get your deposit address.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {!isLoggedIn ? (
            <Button onClick={handleLoginWithWallet} disabled={loading || !connected} className="w-full mb-4">
              {loading ? "Authenticating..." : "Login/Register with Wallet"}
            </Button>
          ) : (
            <Tabs defaultValue="sol" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sol">SOL</TabsTrigger>
                <TabsTrigger value="psng">PSNG</TabsTrigger>
              </TabsList>
              <TabsContent value="sol" className="pt-4 space-y-2">
                <Label htmlFor="sol-deposit-address">SOL Deposit Address</Label>
                <div className="flex items-center gap-2">
                  <Input id="sol-deposit-address" value={depositWallet} readOnly />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(depositWallet, 'SOL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only native SOL to this address.</p>
                {solBalance !== undefined && (
                  <div className="text-xs text-success pt-1 font-semibold">Your Balance: {solBalance.toFixed(4)} SOL</div>
                )}
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                <Label htmlFor="psng-deposit-address">PSNG Deposit Address</Label>
                <div className="flex items-center gap-2">
                  <Input id="psng-deposit-address" value={psngDepositWallet} readOnly />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(psngDepositWallet, 'PSNG')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only PSNG tokens to this address.</p>
                {psngBalance !== undefined && (
                  <div className="text-xs text-success pt-1 font-semibold">Your Balance: {psngBalance.toFixed(4)} PSNG</div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <div className="text-xs text-center text-muted-foreground pt-4">
            Your funds will be credited after network confirmation.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
