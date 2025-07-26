
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useState } from "react";
import WalletSetupDialog from "@/components/WalletSetupDialog";
import WalletWithdrawDialog from "@/components/WalletWithdrawDialog";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  projectName: z.string().min(2, "Project name must be at least 2 characters."),
  tagline: z.string().min(10, "Tagline must be at least 10 characters."),
  iconUrl: z.string().url("Please enter a valid URL for the project icon."),
  shortDescription: z.string().min(20, "Short description is too short.").max(150, "Short description is too long."),
  longDescription: z.string().min(100, "Long description is too short."),
  softCap: z.coerce.number().positive("Soft cap must be a positive number."),
  hardCap: z.coerce.number().positive("Hard cap must be a positive number."),
  presalePrice: z.coerce.number().positive("Price must be a positive number."),
  totalSupply: z.coerce.number().positive("Total supply must be a positive number."),
  tokenomicsPresale: z.coerce.number().min(1).max(100),
  tokenomicsLiquidity: z.coerce.number().min(1).max(100),
  tokenomicsTeam: z.coerce.number().min(0).max(100),
  tokenomicsMarketing: z.coerce.number().min(0).max(100),
  twitter: z.string().url().optional().or(z.literal('')),
  telegram: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

export default function CreateLaunchpadPage() {
    const { toast } = useToast();
    const [isMarketBarOpen, setMarketBarOpen] = useState(false);
    const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
    const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      tagline: "",
      iconUrl: "",
      shortDescription: "",
      longDescription: "",
      softCap: undefined,
      hardCap: undefined,
      presalePrice: undefined,
      totalSupply: undefined,
      tokenomicsPresale: 25,
      tokenomicsLiquidity: 20,
      tokenomicsTeam: 15,
      tokenomicsMarketing: 15,
      twitter: "",
      telegram: "",
      website: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // TODO: Connect this to Firebase to save the project data
    console.log("Form Submitted!", values);
    toast({
      title: "Project Submitted (DEMO)",
      description: "Your project has been submitted for review. This is a UI demonstration.",
    });
    form.reset();
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <WalletSetupDialog 
        isOpen={isWalletSetupOpen} 
        onOpenChange={setWalletSetupOpen}
      />
      <WalletWithdrawDialog
        isOpen={isWalletWithdrawOpen}
        onOpenChange={setWalletWithdrawOpen}
      />
       <Header 
        isMarketBarOpen={isMarketBarOpen} 
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        onDepositClick={() => setWalletSetupOpen(true)}
        onWithdrawClick={() => setWalletWithdrawOpen(true)}
      />
      <main className="flex-1 container mx-auto max-w-screen-md px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Create Your Presale</h1>
          <p className="mt-3 text-muted-foreground">
            Fill out the form below to submit your project to the LUMADEX Launchpad.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Basic information about your project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. My Awesome Project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input placeholder="A short, catchy phrase for your project." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="iconUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormDescription>
                        A direct link to your project's icon (PNG, JPG, or SVG).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief summary of your project (max 150 characters)." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea rows={6} placeholder="Describe your project in detail. Explain its mission, technology, and value proposition." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Presale Setup</CardTitle>
                <CardDescription>Configure the parameters for your token sale.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                      control={form.control}
                      name="softCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soft Cap (SOL)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g. 1000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hardCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hard Cap (SOL)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g. 5000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <FormField
                  control={form.control}
                  name="presalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presale Price (SOL per Token)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 0.0001" step="0.00000001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>Tokenomics</CardTitle>
                <CardDescription>Define the token distribution for your project. The total must equal 100%.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Supply</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 1000000000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <FormField control={form.control} name="tokenomicsPresale" render={({ field }) => (<FormItem><FormLabel>Presale (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsLiquidity" render={({ field }) => (<FormItem><FormLabel>Liquidity (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsTeam" render={({ field }) => (<FormItem><FormLabel>Team (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsMarketing" render={({ field }) => (<FormItem><FormLabel>Marketing (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Community Links</CardTitle>
                    <CardDescription>Links to your project's website and social media channels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="twitter" render={({ field }) => (<FormItem><FormLabel>Twitter</FormLabel><FormControl><Input placeholder="https://twitter.com/yourproject" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="telegram" render={({ field }) => (<FormItem><FormLabel>Telegram</FormLabel><FormControl><Input placeholder="https://t.me/yourproject" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg">Submit Project for Review</Button>
            </div>
          </form>
        </Form>
      </main>
      <BottomBar />
    </div>
  );
}
