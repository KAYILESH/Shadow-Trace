import {
  Search,
  ShieldAlert,
  Trash2,
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// Maps notification type → icon + color
export function getNotificationConfig(type: string) {
  switch (type) {
    case "scan_completed":
      return { icon: Search, color: "#FF6B00", label: "Scan Completed" };
    case "risk_increased":
      return { icon: ShieldAlert, color: "#FF0033", label: "Risk Increased" };
    case "cleanup_reminder":
      return { icon: Trash2, color: "#EAB308", label: "Cleanup Reminder" };
    case "deletion_reminder":
      return { icon: Trash2, color: "#FF3300", label: "Deletion Reminder" };
    case "warning":
      return { icon: AlertTriangle, color: "#EAB308", label: "Warning" };
    case "success":
      return { icon: CheckCircle2, color: "#10B981", label: "Success" };
    case "info":
    default:
      return { icon: Info, color: "#FF6B00", label: "Info" };
  }
}

// Helper to fire a notification via the API (call from client)
export async function createNotification(payload: {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}) {
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return null;
  }
}
