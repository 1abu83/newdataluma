
"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, LineData, SeriesMarker } from 'lightweight-charts';
import { Card, CardContent } from "@/components/ui/card";
import type { Asset } from "@/app/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LineChart } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type ChartDataPoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TradeMarker = {
  time: number;
  price: number;
  type: 'buy' | 'sell';
}

interface PriceChartProps {
  selectedAsset: Asset;
  tradeMarkers: TradeMarker[];
}

const timeframes = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '30m', value: '30' },
    { label: '1H', value: '60' },
    { label: '4H', value: '240' },
    { label: '1D', value: '1440' },
];

// Function to calculate Simple Moving Average
const calculateSMA = (data: CandlestickData[], period: number): LineData[] => {
    let smaData: LineData[] = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        smaData.push({
            time: data[i].time,
            value: sum / period,
        });
    }
    return smaData;
};


export default function PriceChart({ selectedAsset, tradeMarkers }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('5');
  const [showSMA, setShowSMA] = useState(false);
  const isMobile = useIsMobile();
  
  const chartHeight = useMemo(() => isMobile ? 300 : 400, [isMobile]);

  useEffect(() => {
    if (!selectedAsset) return;

    setLoading(true);
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/market-data?type=assetData&assetId=${selectedAsset.id}&timeframe=${activeTimeframe}`);
        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }
        const data = await response.json();
        
        if (isMounted) {
            const formattedData: CandlestickData[] = data.priceChart.map((d: ChartDataPoint) => ({
              time: d.time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close,
            }));
            setChartData(formattedData);
            if (loading) setLoading(false);
        }
      } catch (error) {
        console.error(error);
        if (isMounted && loading) setLoading(false);
      }
    };
    
    fetchData();
    
    const intervalId = setInterval(fetchData, 2000);

    return () => {
        isMounted = false;
        clearInterval(intervalId);
    };
  }, [selectedAsset, activeTimeframe, loading]);

  useEffect(() => {
    if (loading || !chartContainerRef.current || chartData.length === 0) return;

    const style = getComputedStyle(document.body);
    
    const getColor = (variable: string) => {
        const hslValue = style.getPropertyValue(variable).trim();
        if (!hslValue) return '#000';
        
        const tempDiv = document.createElement('div');
        tempDiv.style.color = `hsl(${hslValue})`;
        document.body.appendChild(tempDiv);
        const rgbColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        return rgbColor;
    }

    if (!chartRef.current) {
        chartRef.current = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: chartHeight,
          layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: getColor('--foreground'),
          },
          grid: {
            vertLines: { visible: false },
            horzLines: { visible: false },
          },
          rightPriceScale: {
            borderColor: 'rgba(197, 203, 206, 0.2)',
            scaleMargins: {
                top: 0.2,
                bottom: 0.2,
            },
            visible: true,
          },
          timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.2)',
            timeVisible: true,
            secondsVisible: activeTimeframe === '1',
          },
        });

        seriesRef.current = chartRef.current.addCandlestickSeries({
            upColor: getColor('--success'),
            downColor: getColor('--destructive'),
            borderDownColor: getColor('--destructive'),
            borderUpColor: getColor('--success'),
            wickDownColor: getColor('--destructive'),
            wickUpColor: getColor('--success'),
        });
    } else {
        chartRef.current.applyOptions({ 
          height: chartHeight,
          rightPriceScale: {
            visible: true,
          }
        });
    }
    
    chartRef.current.applyOptions({
        watermark: {
            color: 'rgba(118, 128, 140, 0.4)',
            visible: true,
            text: selectedAsset.id,
            fontSize: 24,
            horzAlign: 'left',
            vertAlign: 'top',
        },
        timeScale: {
          secondsVisible: activeTimeframe === '1',
          timeVisible: parseInt(activeTimeframe) < 1440,
        }
    });

    seriesRef.current?.setData(chartData);

    const markers: SeriesMarker<UTCTimestamp>[] = tradeMarkers.map(marker => ({
      time: marker.time as UTCTimestamp,
      position: marker.type === 'buy' ? 'belowBar' : 'aboveBar',
      color: marker.type === 'buy' ? getColor('--success') : getColor('--destructive'),
      shape: marker.type === 'buy' ? 'arrowUp' : 'arrowDown',
      text: marker.type === 'buy' ? 'Buy' : 'Sell',
      size: 1,
    }));

    seriesRef.current?.setMarkers(markers);
    
    if (showSMA) {
        if (!smaSeriesRef.current) {
            smaSeriesRef.current = chartRef.current.addLineSeries({
                color: 'rgba(255, 165, 0, 0.8)',
                lineWidth: 2,
            });
        }
        const smaData = calculateSMA(chartData, 20); // 20-period SMA
        smaSeriesRef.current.setData(smaData);
    } else {
        if (smaSeriesRef.current) {
            chartRef.current.removeSeries(smaSeriesRef.current);
            smaSeriesRef.current = null;
        }
    }


    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [loading, chartData, selectedAsset.id, activeTimeframe, showSMA, chartHeight, isMobile, tradeMarkers]);
  
  useEffect(() => {
      return () => {
          if (chartRef.current) {
              chartRef.current.remove();
              chartRef.current = null;
          }
      }
  }, []);


  if (loading && chartData.length === 0) {
    return (
      <Card className="rounded-none md:rounded-lg">
        <CardContent className="relative pt-6">
           <div className="absolute top-2 left-2 z-10 flex gap-1">
             {timeframes.map((tf) => ( <Skeleton key={tf.value} className="h-7 w-10" /> ))}
           </div>
          <Skeleton className="h-[300px] md:h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none md:rounded-lg">
      <CardContent className="relative pt-6 pr-0 md:pr-6">
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 flex-wrap">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTimeframe(tf.value)}
              className={cn(
                "px-2 py-1 h-auto text-xs",
                activeTimeframe === tf.value ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              {tf.label}
            </Button>
          ))}
          <div className="border-l border-border h-5 mx-1"></div>
           <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSMA(!showSMA)}
              className={cn(
                "px-2 py-1 h-auto text-xs",
                showSMA ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <LineChart className="h-3 w-3 mr-1" />
              SMA
            </Button>
        </div>
        <div ref={chartContainerRef} style={{ height: `${chartHeight}px`, width: '100%' }} />
      </CardContent>
    </Card>
  );
}
