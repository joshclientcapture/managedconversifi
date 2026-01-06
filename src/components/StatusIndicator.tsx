import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  label: string;
  status: "idle" | "connecting" | "connected" | "error";
}

const StatusIndicator = ({ label, status }: StatusIndicatorProps) => {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
          status === "idle" && "bg-muted",
          status === "connecting" && "bg-primary/20",
          status === "connected" && "bg-success",
          status === "error" && "bg-destructive"
        )}
      >
        {status === "idle" && (
          <Circle className="h-3 w-3 text-muted-foreground" />
        )}
        {status === "connecting" && (
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
        )}
        {status === "connected" && (
          <Check className="h-3 w-3 text-success-foreground" />
        )}
        {status === "error" && (
          <span className="text-xs text-destructive-foreground">!</span>
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          status === "idle" && "text-muted-foreground",
          status === "connecting" && "text-foreground",
          status === "connected" && "text-success",
          status === "error" && "text-destructive"
        )}
      >
        {label}
      </span>
      {status === "connected" && (
        <span className="ml-auto text-xs text-success font-medium">Connected</span>
      )}
    </div>
  );
};

export default StatusIndicator;
