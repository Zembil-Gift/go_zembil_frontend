import { useQuery } from '@tanstack/react-query';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { adminService } from '@/services/adminService';
import { useState } from 'react';

// Brand colors from tailwind.config.js
const BRAND_COLORS = {
  eagleGreen: '#01405C',      // Primary brand color
  viridianGreen: '#11A0A0',   // Teal accent
  ethiopianGold: '#FDCB2D',   // Gold accent
  juneBud: '#B2D55B',         // Light green
  warmRed: '#E94E1B',         // Red accent
};

const chartConfig = {
  productRevenue: {
    label: 'Products',
    color: BRAND_COLORS.eagleGreen,
  },
  eventRevenue: {
    label: 'Events',
    color: BRAND_COLORS.viridianGreen,
  },
  ordersCount: {
    label: 'Orders',
    color: BRAND_COLORS.ethiopianGold,
  },
  avgOrderValue: {
    label: 'Avg Order',
    color: BRAND_COLORS.juneBud,
  },
} satisfies ChartConfig;

interface RevenueTrendChartProps {
  className?: string;
  showTotal?: boolean;
  showOrders?: boolean;
  showAvgOrder?: boolean;
  title?: string;
  description?: string;
}

export function RevenueTrendChart({
  className,
                                    showOrders = true,
  showAvgOrder = false,
  title = 'Revenue Trends',
  description = 'Product and event revenue over time',
}: RevenueTrendChartProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'revenue-trends', period],
    queryFn: () => adminService.getRevenueTrends(period),
    retry: 1,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data?.currency || 'ETB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalRevenue = data?.data?.reduce((sum, d) => sum + (d.totalRevenue || 0), 0) || 0;
  const totalOrders = data?.data?.reduce((sum, d) => sum + (d.ordersCount || 0), 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Failed to load revenue data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Unable to fetch revenue trends</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          {!isLoading && data && (
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="text-muted-foreground">Total Revenue</p>
                <p className="font-bold text-eagle-green">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Total Orders</p>
                <p className="font-bold text-viridian-green">{totalOrders.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Avg Order</p>
                <p className="font-bold text-ethiopian-gold">{formatCurrency(avgOrderValue)}</p>
              </div>
            </div>
          )}
          <Select value={period} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setPeriod(value)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[350px] flex flex-col gap-2">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ComposedChart
              data={data?.data || []}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="revenue"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                className="fill-muted-foreground"
              />
              {showOrders && (
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  className="fill-muted-foreground"
                />
              )}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: number | string, name: string) => {
                      const config = chartConfig[name as keyof typeof chartConfig];
                      const label = config?.label || name;
                      
                      if (name === 'ordersCount') {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{label}:</span>
                            <span className="font-medium">{(value as number).toLocaleString()}</span>
                          </div>
                        );
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{label}:</span>
                          <span className="font-medium">{formatCurrency(value as number)}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              
              {/* Revenue Lines */}
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="productRevenue"
                stroke={BRAND_COLORS.eagleGreen}
                strokeWidth={3}
                dot={{
                  fill: BRAND_COLORS.eagleGreen,
                  r: 4,
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                activeDot={{
                  r: 6,
                  fill: BRAND_COLORS.eagleGreen,
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="eventRevenue"
                stroke={BRAND_COLORS.viridianGreen}
                strokeWidth={3}
                dot={{
                  fill: BRAND_COLORS.viridianGreen,
                  r: 4,
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                activeDot={{
                  r: 6,
                  fill: BRAND_COLORS.viridianGreen,
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
              
              {/* Orders Bar */}
              {showOrders && (
                <Bar
                  yAxisId="orders"
                  dataKey="ordersCount"
                  fill={BRAND_COLORS.ethiopianGold}
                  opacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
              )}
              
              {/* Average Order Value Line */}
              {showAvgOrder && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="avgOrderValue"
                  stroke={BRAND_COLORS.juneBud}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{
                    fill: BRAND_COLORS.juneBud,
                    r: 3,
                  }}
                  activeDot={{
                    r: 5,
                    fill: BRAND_COLORS.juneBud,
                  }}
                />
              )}
            </ComposedChart>
          </ChartContainer>
        )}
        
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: BRAND_COLORS.eagleGreen }}
            />
            <span className="text-sm text-muted-foreground">Product Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: BRAND_COLORS.viridianGreen }}
            />
            <span className="text-sm text-muted-foreground">Event Revenue</span>
          </div>
          {showOrders && (
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: BRAND_COLORS.ethiopianGold, opacity: 0.5 }}
              />
              <span className="text-sm text-muted-foreground">Orders Count</span>
            </div>
          )}
          {showAvgOrder && (
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-6 border-t-2 border-dashed"
                style={{ borderColor: BRAND_COLORS.juneBud }}
              />
              <span className="text-sm text-muted-foreground">Avg Order Value</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RevenueTrendChart;
