'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Plus, 
  Search, 
  MoreVertical, 
  ShieldCheck,
  Activity,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const [institutes, setInstitutes] = useState<
    { id: number; name: string; subdomain: string; owner: string; status: string; plan: string; users: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo
    setInstitutes([
      { id: 1, name: 'Global Academy', subdomain: 'global', owner: 'admin@global.com', status: 'active', plan: 'enterprise', users: 1250 },
      { id: 2, name: 'Tech Institute', subdomain: 'tech', owner: 'admin@tech.com', status: 'active', plan: 'pro', users: 450 },
      { id: 3, name: 'Future School', subdomain: 'future', owner: 'admin@future.com', status: 'trial', plan: 'basic', users: 50 },
    ]);
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Institutes', value: '24', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Active Subscriptions', value: '18', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Total Platform Users', value: '12.5k', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Monthly Revenue', value: '$42,500', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-3xl border border-border shadow-sm">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-muted-foreground mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-foreground">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Institute Management */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-foreground">Institute Management</h3>
            <p className="text-sm text-muted-foreground font-medium">Manage your SaaS clients and their subscriptions</p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Search institutes..." 
                className="w-64 rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button className="emis-btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md transition-all">
              <Plus size={18} />
              Add Institute
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Institute</th>
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Subdomain</th>
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Plan</th>
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Users</th>
                <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {institutes.map((inst) => (
                <tr key={inst.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-blue-600 font-bold">
                        {inst.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{inst.name}</p>
                        <p className="text-xs text-muted-foreground">{inst.owner}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Globe size={14} className="text-muted-foreground" />
                      {inst.subdomain}.emispro.com
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      inst.plan === 'enterprise' ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : 
                      inst.plan === 'pro' ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-muted text-foreground/80"
                    )}>
                      {inst.plan}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        inst.status === 'active' ? "bg-emerald-500" : "bg-orange-500"
                      )} />
                      <span className="text-sm font-bold text-foreground/80 capitalize">{inst.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-muted-foreground">{inst.users}</td>
                  <td className="px-8 py-5">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
