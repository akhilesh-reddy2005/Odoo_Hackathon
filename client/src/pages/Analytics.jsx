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

  // Custom tooltips styling for charts
  const customTooltipStyle = {
    backgroundColor: '#0e1420',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#d1d5db',
    fontFamily: 'Inter, sans-serif',
    fontSize: '12px'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Visual summaries cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-brand-orange flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Top Performer Driver</span>
            <span className="text-lg font-bold text-white mt-1.5 block">{topDrivers[0]?.name || 'N/A'}</span>
            <span className="text-[10px] text-green-400 mt-1 block">Safety Score: {topDrivers[0]?.safety}%</span>
          </div>
          <Award className="h-7 w-7 text-brand-orange/60" />
        </div>
        <div className="glass-card p-6 border-l-4 border-l-blue-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Highest Maintenance Truck</span>
            <span className="text-lg font-bold text-white mt-1.5 block truncate max-w-[150px]">{costlyVehicles[0]?.name || 'N/A'}</span>
            <span className="text-[10px] text-red-400 mt-1 block">Spent: ₹{costlyVehicles[0]?.cost.toFixed(2)}</span>
          </div>
          <Wrench className="h-7 w-7 text-blue-500/60" />
        </div>
        <div className="glass-card p-6 border-l-4 border-l-green-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Highest Fuel Consumer</span>
            <span className="text-lg font-bold text-white mt-1.5 block truncate max-w-[150px]">{fuelConsumption[0]?.name || 'N/A'}</span>
            <span className="text-[10px] text-amber-500 mt-1 block">Quantity: {fuelConsumption[0]?.quantity.toFixed(0)} L</span>
          </div>
          <TrendingUp className="h-7 w-7 text-green-500/60" />
        </div>
      </section>

      {/* Geospatial Analytics Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-cyan-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Average Dispatch Distance</span>
            <span className="text-2xl font-extrabold text-white mt-1.5 block font-mono">{averageDistance || 0} km</span>
            <span className="text-[10px] text-cyan-400 mt-1 block">Across all completed operations</span>
          </div>
          <Compass className="h-7 w-7 text-cyan-500/60 animate-pulse" />
        </div>
        <div className="glass-card p-6 border-l-4 border-l-indigo-500 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Average Transit Duration</span>
            <span className="text-2xl font-extrabold text-white mt-1.5 block font-mono">{averageDuration || 0} Minutes</span>
            <span className="text-[10px] text-indigo-400 mt-1 block">Estimated driving hours per trip</span>
          </div>
          <Clock className="h-7 w-7 text-indigo-500/60" />
        </div>
      </section>

      {/* Charts Deck Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Monthly Trips Chart */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-brand-orange" />
              Monthly Trips & Success Volume
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrips}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconSize={8} formatter={(value) => <span className="text-[10px] text-gray-400 font-medium font-sans">{value}</span>} />
                <Area type="monotone" dataKey="trips" stroke="#f97316" fillOpacity={1} fill="url(#colorTrips)" name="Total Dispatched" />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" fillOpacity={0} name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 2. Monthly Expenses Stacked Chart */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-brand-orange" />
              Monthly Expenditures breakdown
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyExpenses} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconSize={8} formatter={(value) => <span className="text-[10px] text-gray-400 font-medium font-sans">{value}</span>} />
                <Bar dataKey="Fuel" fill="#f97316" stackId="a" />
                <Bar dataKey="Maintenance" fill="#3b82f6" stackId="a" />
                <Bar dataKey="Tolls" fill="#eab308" stackId="a" />
                <Bar dataKey="Other" fill="#64748b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 3. Fuel Consumption Trends */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4.5 w-4.5 text-brand-orange" />
              Fuel Purchases: Liters vs. Total Cost
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={10} />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconSize={8} formatter={(value) => <span className="text-[10px] text-gray-400 font-medium font-sans">{value}</span>} />
                <Bar yAxisId="left" dataKey="quantity" fill="#3b82f6" name="Fuel Liters" />
                <Bar yAxisId="right" dataKey="cost" fill="#f97316" name="Total Cost (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Vehicle ROI Performance */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-brand-orange" />
              Vehicle Acquisition ROI Comparison
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vehicleROI}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconSize={8} formatter={(value) => <span className="text-[10px] text-gray-400 font-medium font-sans">{value}</span>} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} name="Earned Revenue (₹)" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Total Expenses (₹)" />
                <Line type="monotone" dataKey="roi" stroke="#f97316" strokeDasharray="4 4" name="ROI % Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Geospatial & Routes Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Travelled Routes */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-brand-orange" />
              Top Shipping Corridors & Routes
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostTravelledRoutes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                <YAxis dataKey="route" type="category" stroke="#9ca3af" fontSize={9} width={130} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="count" fill="#f97316" name="Trips Completed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Frequented Locations Heatmap */}
        <section className="glass-card p-6 border border-white/5 flex flex-col justify-between">
          <div className="border-b border-white/5 pb-4 mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4.5 w-4.5 text-brand-orange" />
              Frequented Operations Heatmap
            </h3>
          </div>
          <div className="h-64 rounded-xl overflow-hidden border border-white/10 relative">
            <LeafletMap
              center={{ lat: 39.8283, lng: -98.5795 }}
              zoom={4}
              height="100%"
              circles={(heatmapPoints || []).map(p => ({
                lat: p.lat,
                lng: p.lng,
                radius: 55000,
                color: '#f97316',
                fillOpacity: 0.18 * (p.weight || 1)
              }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
