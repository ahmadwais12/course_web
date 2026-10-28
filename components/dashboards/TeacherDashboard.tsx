'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  GraduationCap, 
  Clock,
  PlusCircle
} from 'lucide-react';
import Timetable from '@/components/Timetable';
import { cn } from '@/lib/utils';

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/teacher')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  const mockSchedule = [
    { day: 'Sunday', time: '08:00 - 10:00', course: 'IELTS Advanced', room: 'Room 101' },
    { day: 'Sunday', time: '10:00 - 12:00', course: 'TOEFL Prep', room: 'Room 204' },
  ];

  if (loading) return <div className="p-8 text-center font-bold text-muted-foreground">Loading Teacher Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'My Students', value: data?.studentsCount || '0', icon: Users, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
          { label: 'Active Classes', value: data?.activeClasses || '0', icon: BookOpen, gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
          { label: 'Avg. Attendance', value: '92%', icon: CheckCircle2, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
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
          {/* Schedule */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-foreground">My Schedule</h3>
              <button className="text-sm font-bold text-blue-600 flex items-center gap-1">
                <Calendar size={16} />
                Full Calendar
              </button>
            </div>
            <Timetable entries={mockSchedule} />
          </div>

          {/* Quick Actions */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Mark Attendance', icon: CheckCircle2, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
                { name: 'Add Grades', icon: GraduationCap, gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
                { name: 'Create Exam', icon: PlusCircle, gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300' },
                { name: 'My Students', icon: Users, gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
              ].map((action) => (
                <button key={action.name} className="flex flex-col items-center p-4 rounded-2xl bg-muted hover:bg-accent transition-all group relative overflow-hidden">
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity", action.gradient)} />
                  <action.icon size={24} className="mb-2 text-muted-foreground group-hover:text-blue-600 relative z-10" />
                  <span className="text-xs font-bold text-center relative z-10">{action.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Upcoming Exams */}
          <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
            <h3 className="text-xl font-black text-foreground mb-6">Upcoming Exams</h3>
            <div className="space-y-4">
              {[
                { title: 'Midterm - IELTS', date: 'Oct 24', time: '10:00 AM', gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500' },
                { title: 'Final - TOEFL', date: 'Nov 02', time: '09:00 AM', gradient: 'bg-gradient-to-b from-sky-400 to-sky-200' },
              ].map((exam, i) => (
                <div key={i} className="p-4 rounded-2xl bg-muted border border-border relative overflow-hidden">
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", exam.gradient)} />
                  <p className="text-sm font-black text-foreground">{exam.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs font-bold text-muted-foreground">
                    <Calendar size={12} />
                    {exam.date}
                    <Clock size={12} className="ml-2" />
                    {exam.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
