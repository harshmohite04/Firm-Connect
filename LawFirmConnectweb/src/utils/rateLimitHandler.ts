import toast from "react-hot-toast";

const FEATURE_MAP: Record<string, string> = {
  "/chat": "Chat",
  "/check-sources": "Source Verification",
  "/ingest": "Document Upload",
  "/retry-ingest": "Document Retry",
  "/documents": "Documents",
  "/generate-document": "Document Generation",
  "/save-document": "Document Save",
  "/draft": "Document Drafting",
  "/investigation": "Investigation",
  "/case-law": "Case Law Search",
  "/document-text": "Document Viewer",
  "/download": "Document Download",
  "/health": "Health Check",
  "/api/admin": "Admin",
};

function getFeatureName(url: string): string {
  for (const [path, name] of Object.entries(FEATURE_MAP)) {
    if (url.includes(path)) return name;
  }
  return "This service";
}

// Deduplicate: don't spam toasts if multiple requests fail at once
let lastToastTime = 0;

export function handleRateLimitError(url: string): void {
  const now = Date.now();
  if (now - lastToastTime < 3000) return;
  lastToastTime = now;

  const feature = getFeatureName(url);
  toast.error(
    `${feature}: Too many requests. Please wait a moment and try again.`,
    {
      duration: 4000,
      id: "rate-limit",
    },
  );
}
