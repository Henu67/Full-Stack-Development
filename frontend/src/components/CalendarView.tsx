import React from 'react';
import type { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  // A very basic calendar grid just to demonstrate the feature
  const today = new Date();
  
  // Get days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const daysInMonth = getDaysInMonth(today.getFullYear(), today.getMonth());
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate.getDate() === day && 
             taskDate.getMonth() === today.getMonth() && 
             taskDate.getFullYear() === today.getFullYear();
    });
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {monthNames[today.getMonth()]} {today.getFullYear()}
        </h2>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {blanks.map(blank => (
          <div key={`blank-${blank}`} className="bg-white min-h-[100px]" />
        ))}
        
        {days.map(day => {
          const dayTasks = getTasksForDay(day);
          const isToday = day === today.getDate();
          
          return (
            <div key={day} className={`bg-white min-h-[100px] p-2 transition-colors hover:bg-gray-50 ${isToday ? 'bg-indigo-50/30' : ''}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${isToday ? 'bg-indigo-600 text-white font-bold' : 'text-gray-700'}`}>
                {day}
              </span>
              <div className="mt-2 flex flex-col gap-1">
                {dayTasks.map(task => (
                  <div 
                    key={task.id} 
                    className="text-xs truncate px-2 py-1 rounded shadow-sm font-medium"
                    style={{ backgroundColor: task.color, color: 'rgba(0,0,0,0.7)' }}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
