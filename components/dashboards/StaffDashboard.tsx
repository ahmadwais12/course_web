'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  Briefcase, 
  UserPlus, 
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Search,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StaffDashboard({ stats }: { stats: any }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/staff')
      .then(res => res.json())
      .then(data => {
        setStaffList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setStaffList([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Staff & Operations</h1>
          <p className="text-muted-foreground mt-1">Manage HR, Payroll, and Student Registrations.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-100">
            <UserPlus size={20} />
            New Registration
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground/80 rounded-xl font-bold hover:bg-muted transition-all">
            <Plus size={20} />
            Add Staff
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `$${stats?.revenue?.toLocaleString() || '0'}`, icon: DollarSign, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
          { label: 'Active Staff', value: stats?.staff || '0', icon: Briefcase, gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
          { label: 'New Students', value: stats?.students || '0', icon: Users, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
          { label: 'Pending Payroll', value: '$4,200', icon: CreditCard, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
        ].map((item, i) => (
          <div key={i} className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-xl transition-all group">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white shadow-md", item.gradient)}>
              <item.icon size={24} />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{item.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/50">
            <h2 className="font-black text-foreground">Staff Directory & Payroll</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Salary</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Loading staff data...</td></tr>
                ) : staffList.length > 0 ? staffList.map((staff: any, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{staff.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{staff.role}</td>
                    <td className="px-6 py-4 font-bold text-foreground">${staff.salary?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        staff.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {staff.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No staff members found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
            <div className="flex items-center justify-between mb-8">
              <TrendingUp size={32} />
              <span className="text-xs font-bold bg-card/20 px-3 py-1 rounded-full">Monthly Growth</span>
            </div>
            <p className="text-blue-100 font-medium">Net Profit Margin</p>
            <h3 className="text-4xl font-black mt-2">24.8%</h3>
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-200">Total Expenses</p>
                <p className="font-bold">$8,420</p>
              </div>
              <ArrowUpRight size={24} className="text-blue-200" />
            </div>
          </div>
          
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
            <h2 className="font-black text-foreground mb-4">Quick Reports</h2>
            <div className="space-y-2">
              {[
                { name: 'Daily Cash Flow', gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
                { name: 'Monthly Revenue', gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
                { name: 'Staff Attendance', gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
                { name: 'Student Dues', gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' }
              ].map((report) => (
                <button key={report.name} className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full", report.gradient)} />
                    <span className="text-sm font-bold text-muted-foreground group-hover:text-blue-600">{report.name}</span>
                  </div>
                  <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
