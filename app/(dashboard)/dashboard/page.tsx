'use client';

import React, { useEffect, useState } from 'react';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import { toast } from '@/components/ui/Toast';

export default function DashboardHomePage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard stats');
        return res.json();
      })
      .then((data) => setStats(data))
      .catch((e) => {
        setStats(null);
        toast.error(e instanceof Error ? e.message : 'Failed to load dashboard stats');
      });
  }, []);

  return <AdminDashboard stats={stats} />;
}
