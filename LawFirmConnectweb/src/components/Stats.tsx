import React from 'react';
import { Briefcase, Users, Award, Clock } from 'lucide-react';

const Stats: React.FC = () => {
  const stats = [
    { value: '25+', label: 'Years of Experience', description: 'Defending client rights', icon: <Award className="w-5 h-5" /> },
    { value: '1k+', label: 'Cases Won', description: 'Across all practice areas', icon: <Briefcase className="w-5 h-5" /> },
    { value: '50+', label: 'Expert Attorneys', description: 'Specialized in your needs', icon: <Users className="w-5 h-5" /> },
    { value: '24/7', label: 'Client Support', description: 'Always here for you', icon: <Clock className="w-5 h-5" /> },
  ];

  return (
    <section className="py-16 bg-white border-y border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative p-6 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-900 text-white group-hover:bg-stone-800 transition-colors">
                  {stat.icon}
                </div>
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-4xl lg:text-5xl font-extrabold text-stone-900 mb-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm text-stone-500">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
