import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <Skeleton className="w-16 h-8 mb-2" />
    <Skeleton className="w-24 h-4" />
  </div>
);

export const SkeletonCaseItem: React.FC = () => (
  <div className="p-5 flex items-start gap-4">
    <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
    <div className="flex-1">
      <Skeleton className="w-48 h-5 mb-2" />
      <Skeleton className="w-full h-4 mb-3" />
      <div className="flex gap-3">
        <Skeleton className="w-16 h-6 rounded-lg" />
        <Skeleton className="w-24 h-6 rounded-lg" />
      </div>
    </div>
  </div>
);

export const SkeletonDashboard: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 lg:p-8 border border-slate-200 dark:border-slate-700">
      <Skeleton className="w-64 h-8 mb-2" />
      <Skeleton className="w-48 h-5" />
    </div>
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
    {/* Content */}
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <Skeleton className="w-32 h-6" />
      </div>
      {[...Array(3)].map((_, i) => <SkeletonCaseItem key={i} />)}
    </div>
  </div>
);

export const SkeletonCasesList: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 lg:p-8 border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-64 h-5" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-28 h-10 rounded-xl" />
          <Skeleton className="w-28 h-10 rounded-xl" />
        </div>
      </div>
    </div>
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
    {/* Search */}
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      <Skeleton className="w-full h-10 rounded-xl" />
    </div>
    {/* Cases list */}
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <Skeleton className="w-32 h-6" />
      </div>
      {[...Array(4)].map((_, i) => <SkeletonCaseItem key={i} />)}
    </div>
  </div>
);

export default Skeleton;
