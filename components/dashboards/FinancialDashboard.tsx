'use client';

import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';

const transactions = [
  { id: 1, type: 'Income', category: 'Tuition Fee', amount: '+$450', date: 'Today', status: 'Completed' },
  { id: 2, type: 'Expense', category: 'Teacher Salary', amount: '-$1,200', date: 'Yesterday', status: 'Pending' },
  { id: 3, type: 'Income', category: 'Book Sale', amount: '+$85', date: '2 days ago', status: 'Completed' },
];

export default function FinancialDashboard() {
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground">Monitor revenue, expenses, and payroll.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground/80 hover:bg-muted transition-colors">
          <Download size={18} />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">+14%</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">$42,850</h3>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-lg">-2%</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Total Expenses</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">$12,400</h3>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent text-blue-600 rounded-xl">
              <Briefcase size={24} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Payroll (Monthly)</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">$8,200</h3>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <CreditCard size={24} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Pending Payments</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">$3,150</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-foreground">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-muted transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {tx.type === 'Income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{tx.category}</h3>
                    <p className="text-sm text-muted-foreground">{tx.date} • {tx.status}</p>
                  </div>
                </div>
                <span className={`font-bold ${
                  tx.type === 'Income' ? 'text-green-600' : 'text-destructive'
                }`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-bold text-foreground mb-6">Financial Actions</h2>
          <div className="space-y-3">
            <button className="emis-btn-primary w-full rounded-xl px-4 py-3 font-medium transition-all">
              Process Payroll
            </button>
            <button className="w-full py-3 px-4 bg-card border border-border text-foreground/80 rounded-xl font-medium hover:bg-muted transition-colors">
              Add Expense
            </button>
            <button className="w-full py-3 px-4 bg-card border border-border text-foreground/80 rounded-xl font-medium hover:bg-muted transition-colors">
              Generate Tax Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
