type AnalyticsEvent = {
  category: string;
  action: string;
  label?: string;
  value?: number;
};

export const trackEvent = ({
  category,
  action,
  label,
  value,
}: AnalyticsEvent) => {
  // In a real application, this would send data to Google Analytics, Mixpanel, etc.
  // For now, we'll log to the console to verify it's working.
  console.log(`[Analytics] ${category} - ${action}`, { label, value });

  // Example of how you might extend this for GA4:
  // if (window.gtag) {
  //   window.gtag('event', action, {
  //     event_category: category,
  //     event_label: label,
  //     value: value
  //   });
  // }
};
