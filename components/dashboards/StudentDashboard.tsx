'use client';

import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  CreditCard, 
  Clock, 
  Calendar,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/student')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center font-bold text-muted-foreground">Loading Student Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Enrolled Courses', value: data?.stats?.courses || '0', icon: BookOpen, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
          { label: 'Avg. Grade', value: data?.stats?.avgGrade || 'N/A', icon: GraduationCap, gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
          { label: 'Attendance', value: data?.stats?.attendance || '0%', icon: CheckCircle2, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
        ].map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-md", stat.gradient)}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-bold text-muted-foreground mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-foreground">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* My Courses */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">My Courses</h3>
            <div className="space-y-4">
              {data?.enrolledCourses?.length > 0 ? data.enrolledCourses.map((course: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl bg-muted border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-black text-foreground">{course.name}</h4>
                      <p className="text-sm font-medium text-muted-foreground">{course.code}</p>
                    </div>
                    <span className="text-sm font-black text-blue-600">75%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all" 
                      style={{ width: `75%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No courses enrolled yet.</p>
              )}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">Recent Grades</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Exam</th>
                    <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Marks</th>
                    <th className="pb-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.grades?.length > 0 ? data.grades.map((grade: any, i: number) => (
                    <tr key={i}>
                      <td className="py-4 text-sm font-bold text-foreground">{grade.exam?.title || 'Exam'}</td>
                      <td className="py-4 text-sm font-black text-blue-600">{grade.marksObtained}</td>
                      <td className="py-4 text-sm font-medium text-muted-foreground">{new Date(grade.date).toLocaleDateString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No grades recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Upcoming Payments */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">Payments</h3>
            <div className="space-y-4">
              {data?.payments?.length > 0 ? data.payments.map((payment: any, i: number) => (
                <div key={i} className={cn(
                  "p-4 rounded-2xl border",
                  payment.status === 'Paid' ? "bg-green-50 border-green-100" : "bg-destructive/10 border-destructive/20"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("text-xs font-black uppercase", payment.status === 'Paid' ? "text-green-600" : "text-destructive")}>
                      {payment.status}
                    </span>
                    <span className={cn("text-sm font-black", payment.status === 'Paid' ? "text-green-600" : "text-destructive")}>
                      ${payment.amount}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{payment.type} - {new Date(payment.dueDate).toLocaleDateString()}</p>
                  {payment.status !== 'Paid' && (
                    <button className="w-full mt-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl text-xs font-black hover:opacity-90 transition-colors">
                      Pay Now
                    </button>
                  )}
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">No payment records.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">Resources</h3>
            <div className="space-y-2">
              {[
                { name: 'My Timetable', icon: Calendar, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
                { name: 'Course Materials', icon: FileText, gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
                { name: 'Exam Schedule', icon: Clock, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
                { name: 'Certificates', icon: GraduationCap, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
              ].map((link) => (
                <button key={link.name} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm", link.gradient)}>
                    <link.icon size={16} />
                  </div>
                  <span className="text-sm font-bold text-foreground/80">{link.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
