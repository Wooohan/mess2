
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight,
  Zap,
  Database,
  RefreshCcw,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '../../store/AppContext';
import { UserRole } from '../../types';

const data = [
  { name: 'Mon', conversations: 40 },
  { name: 'Tue', conversations: 30 },
  { name: 'Wed', conversations: 65 },
  { name: 'Thu', conversations: 45 },
  { name: 'Fri', conversations: 90 },
  { name: 'Sat', conversations: 25 },
  { name: 'Sun', conversations: 15 },
];

const DashboardView: React.FC = () => {
  const { currentUser, dashboardStats, dbStatus, messages } = useApp();
  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const stats = [
    { 
      label: 'Open Chats', 
      value: dashboardStats.openChats.toString(), 
      icon: MessageSquare, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Avg. Response Time', 
      value: dashboardStats.avgResponseTime, 
      icon: Clock, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      label: 'Resolved Total', 
      value: dashboardStats.resolvedToday.toString(), 
      icon: CheckCircle2, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Performance Rate', 
      value: dashboardStats.csat, 
      icon: Zap, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">System Overview, {currentUser?.name.split(' ')[0]}</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">Monitoring conversational throughput.</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${
              dbStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              dbStatus === 'syncing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
              dbStatus === 'initializing' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              <Database size={10} className={dbStatus === 'syncing' ? 'animate-pulse' : ''} />
              {dbStatus === 'syncing' ? 'NoSQL Committing...' : dbStatus === 'connected' ? 'IndexedDB Active' : 'Initializing DB...'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <Activity size={14} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{messages.length} Records</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="flex items-center gap-1 text-green-500 text-xs font-bold">
                <TrendingUp size={14} />
                Live
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-bold text-slate-800">Traffic Ingress</h3>
             <select className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 outline-none">
               <option>Last 24 Hours</option>
               <option>Real-time</option>
             </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#2563eb', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="conversations" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-200 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="flex flex-col h-full relative z-10">
             <div className="p-3 bg-white/20 w-fit rounded-2xl mb-6">
               <Database size={24} />
             </div>
             <h3 className="text-xl font-bold mb-2">NoSQL Engine Ready</h3>
             <p className="text-blue-100 text-sm mb-8 leading-relaxed">The portal is using IndexedDB, a powerful NoSQL database built into your browser, capable of storing millions of message records without lag.</p>
             
             <div className="space-y-4 mt-auto">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-100 uppercase tracking-widest">
                  <span>Throughput Optimized</span>
                  <span>100%</span>
                </div>
                <div className="w-full bg-blue-900/40 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-full rounded-full shadow-sm" />
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4 bg-white text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 mt-4 group"
                >
                  <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                  Re-initialize Engine
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
