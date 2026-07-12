import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { BarChart3, TrendingUp, Sparkles, Wrench, ShieldAlert, Award, Compass, Clock, MapPin } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { analyticsService } from '../services/api';
import { ChartSkeleton } from '../components/Skeleton';
import { CHART_COLORS, CHART_COLOR_SEQUENCE, CHART_TOOLTIP_STYLE, CHART_TOOLTIP_LABEL_STYLE } from '../constants/theme';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);


  // Fetch charts data
  useEffect(() => {
    async function loadCharts() {
      try {
        const res = await analyticsService.getCharts();
        setData(res);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load operations analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadCharts();
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const {
    monthlyTrips,
    monthlyExpenses,
    fuelConsumption,
    costlyVehicles,
    topDrivers,
    vehicleROI,
    mostTravelledRoutes,
    averageDistance,
    averageDuration,
    heatmapPoints
  } = data;

  // Axis / gridline color — neutral mid-gray that reads on both themes
  const AXIS_COLOR = '#94A3B8';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Visual summaries cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card p-5 border-l-2 border-l-brand flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Top Performer Driver</span>
            <span className="text-lg font-bold text-ink-primary mt-2 block">{topDrivers[0]?.name || 'N/A'}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 block">Safety Score: {topDrivers[0]?.safety}%</span>
          </div>
          <div className="bg-brand/10 p-3 rounded-lg">
            <Award className="h-5 w-5 text-brand" />
          </div>
        </div>
        <div className="card p-5 border-l-2 border-l-blue-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Highest Maintenance Truck</span>
            <span className="text-lg font-bold text-ink-primary mt-2 block truncate max-w-[150px]">{costlyVehicles[0]?.name || 'N/A'}</span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-2 block">Spent: ₹{costlyVehicles[0]?.cost.toFixed(2)}</span>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="card p-5 border-l-2 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Highest Fuel Consumer</span>
            <span className="text-lg font-bold text-ink-primary mt-2 block truncate max-w-[150px]">{fuelConsumption[0]?.name || 'N/A'}</span>
            <span className="text-xs text-ink-muted mt-2 block">Quantity: {fuelConsumption[0]?.quantity.toFixed(0)} L</span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Geospatial Analytics Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card p-5 border-l-2 border-l-amber-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Average Dispatch Distance</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block font-mono">{averageDistance || 0} km</span>
            <span className="text-xs text-ink-muted mt-2 block">Across all completed operations</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg">
            <Compass className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="card p-5 border-l-2 border-l-violet-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide block">Average Transit Duration</span>
            <span className="text-2xl font-bold text-ink-primary mt-2 block font-mono">{averageDuration || 0} Minutes</span>
            <span className="text-xs text-ink-muted mt-2 block">Estimated driving hours per trip</span>
          </div>
          <div className="bg-violet-500/10 p-3 rounded-lg">
            <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
      </section>

      {/* Charts Deck Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Monthly Trips Chart */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-6">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-ink-muted" />
              Monthly Trips & Success Volume
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrips}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis stroke={AXIS_COLOR} fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Legend iconSize={8} formatter={(value) => <span className="text-xs text-ink-muted font-medium">{value}</span>} />
                <Area type="monotone" dataKey="trips" stroke={CHART_COLORS.indigo} fillOpacity={1} fill="url(#colorTrips)" name="Total Dispatched" />
                <Area type="monotone" dataKey="completed" stroke={CHART_COLORS.emerald} fillOpacity={0} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 2. Monthly Expenses Stacked Chart */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-6">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-ink-muted" />
              Monthly Expenditures breakdown
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenses} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.15} />
                <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis stroke={AXIS_COLOR} fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Legend iconSize={8} formatter={(value) => <span className="text-xs text-ink-muted font-medium">{value}</span>} />
                <Bar dataKey="Fuel" fill={CHART_COLORS.indigo} stackId="a" />
                <Bar dataKey="Maintenance" fill={CHART_COLORS.blue} stackId="a" />
                <Bar dataKey="Tolls" fill={CHART_COLORS.amber} stackId="a" />
                <Bar dataKey="Other" fill={CHART_COLORS.slate} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 3. Fuel Consumption Trends */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-6">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-ink-muted" />
              Fuel Purchases: Liters vs. Total Cost
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis yAxisId="left" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke={AXIS_COLOR} fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Legend iconSize={8} formatter={(value) => <span className="text-xs text-ink-muted font-medium">{value}</span>} />
                <Bar yAxisId="left" dataKey="quantity" fill={CHART_COLORS.blue} name="Fuel Liters" />
                <Bar yAxisId="right" dataKey="cost" fill={CHART_COLORS.indigo} name="Total Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Vehicle ROI Performance */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-6">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-ink-muted" />
              Vehicle Acquisition ROI Comparison
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vehicleROI}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={9} />
                <YAxis stroke={AXIS_COLOR} fontSize={10} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Legend iconSize={8} formatter={(value) => <span className="text-xs text-ink-muted font-medium">{value}</span>} />
                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.emerald} strokeWidth={2.5} name="Earned Revenue (₹)" />
                <Line type="monotone" dataKey="expenses" stroke={CHART_COLORS.rose} strokeWidth={2} name="Total Expenses (₹)" />
                <Line type="monotone" dataKey="roi" stroke={CHART_COLORS.indigo} strokeDasharray="4 4" name="ROI % Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Geospatial & Routes Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Travelled Routes */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-6">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-ink-muted" />
              Top Shipping Corridors & Routes
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostTravelledRoutes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.15} />
                <XAxis type="number" stroke={AXIS_COLOR} fontSize={10} />
                <YAxis dataKey="route" type="category" stroke={AXIS_COLOR} fontSize={9} width={130} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} />
                <Bar dataKey="count" fill={CHART_COLORS.indigo} name="Trips Completed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Frequented Locations Heatmap */}
        <section className="card p-6 flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-ink-muted" />
              Frequented Operations Heatmap
            </h3>
          </div>
          <div className="h-64 rounded-lg overflow-hidden border border-line relative">
            <LeafletMap
              center={{ lat: 39.8283, lng: -98.5795 }}
              zoom={4}
              height="100%"
              circles={(heatmapPoints || [])
                .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
                .map(p => ({
                  lat: p.lat,
                  lng: p.lng,
                  radius: 55000,
                  color: CHART_COLORS.indigo,
                  fillOpacity: 0.18 * (p.weight || 1)
                }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
