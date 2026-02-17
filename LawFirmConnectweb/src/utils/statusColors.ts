export const getStatusStyle = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'closed':
    case 'resolved':
      return 'bg-slate-100 text-slate-600';
    case 'pending':
    case 'in progress':
      return 'bg-amber-100 text-amber-700';
    case 'review':
    case 'in review':
      return 'bg-purple-100 text-purple-700';
    case 'scheduled':
      return 'bg-blue-100 text-blue-700';
    case 'urgent':
    case 'critical':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const getStatusDarkStyle = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'active':
      return 'dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'closed':
    case 'resolved':
      return 'dark:bg-slate-700/50 dark:text-slate-400';
    case 'pending':
    case 'in progress':
      return 'dark:bg-amber-900/30 dark:text-amber-400';
    case 'review':
    case 'in review':
      return 'dark:bg-purple-900/30 dark:text-purple-400';
    case 'scheduled':
      return 'dark:bg-blue-900/30 dark:text-blue-400';
    case 'urgent':
    case 'critical':
      return 'dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'dark:bg-slate-700/50 dark:text-slate-400';
  }
};
