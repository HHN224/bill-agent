import { CheckCircle2, CircleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToasterContextValue {
  toast: (input: ToastInput) => void;
}

const ToasterContext = createContext<ToasterContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "default",
      };
      setToasts((current) => [...current.slice(-3), item]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md border-2 px-4 py-3 text-sm shadow-pop",
              item.variant === "destructive"
                ? "border-destructive/60 bg-card text-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            {item.variant === "success" ? (
              <CheckCircle2
                aria-hidden
                className="text-success mt-0.5 size-4 shrink-0"
              />
            ) : item.variant === "destructive" ? (
              <CircleAlert
                aria-hidden
                className="text-destructive mt-0.5 size-4 shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.description ? (
                <p className="text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismiss(item.id)}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md p-1 transition-colors"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}

export function useToast(): ToasterContextValue {
  const context = useContext(ToasterContext);
  if (!context) {
    throw new Error("useToast must be used within ToasterProvider");
  }
  return context;
}
