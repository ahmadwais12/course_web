'use client';

import React from 'react';
import { Clock, MapPin, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface TimetableEntry {
  day: string;
  time: string;
  course: string;
  teacher?: string;
  room: string;
}

export default function Timetable({ entries }: { entries: TimetableEntry[] }) {
  const { isRTL } = useLanguage();
  const days = isRTL 
    ? ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    : ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px] grid grid-cols-8 gap-4">
        <div className="col-span-1"></div>
        {days.map(day => (
          <div key={day} className="text-center font-black text-muted-foreground text-xs uppercase tracking-widest py-4">
            {day}
          </div>
        ))}

        <div className="col-span-8 border-t border-border pt-4">
          {entries.map((entry, i) => (
            <div key={i} className="mb-4 p-4 bg-accent border border-border rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-blue-700">{entry.course}</span>
                <div className={cn("flex items-center gap-1 text-xs font-bold text-blue-500", isRTL ? "flex-row-reverse" : "flex-row")}>
                  <Clock size={12} />
                  {entry.time}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {entry.teacher && (
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <User size={12} />
                    {entry.teacher}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MapPin size={12} />
                  {entry.room}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
