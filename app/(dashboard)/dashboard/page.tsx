'use client';

import React, { useEffect, useState } from 'react';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import FinancialDashboard from '@/components/dashboards/FinancialDashboard';
import StaffDashboard from '@/components/dashboards/StaffDashboard';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';
import TeacherDashboard from '@/components/dashboards/TeacherDashboard';
import { SegmentedControl } from '@/components/ports';
import { toast } from '@/components/ui/Toast';

const VIEWS = [
  { value: 'general', label: 'General' },
  { value: 'platform', label: 'Platform' },
  { value: 'finance', label: 'Finance' },
  { value: 'staff', label: 'Staff' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

export default function DashboardHomePage() {
  const [view, setView] = useState('general');
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

  return (
    <div className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <SegmentedControl value={view} onChange={setView} options={VIEWS} className="min-w-max" />
      </div>
      {view === 'general' && <AdminDashboard stats={stats} />}
      {view === 'platform' && <SuperAdminDashboard />}
      {view === 'finance' && <FinancialDashboard stats={stats} />}
      {view === 'staff' && <StaffDashboard stats={stats} />}
      {view === 'teacher' && <TeacherDashboard />}
      {view === 'student' && <StudentDashboard />}
    </div>
  );
}
