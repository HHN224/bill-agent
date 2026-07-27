import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 轻量无障碍模态框：Escape 关闭、焦点圈定在框内、
 * 关闭后焦点归还触发元素、aria 标注完整。
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusables && focusables.length > 0 ? focusables[0] : panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel) {
        return;
      }
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      restoreFocusRef.current?.focus();
    };
  }, [open, close]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden
        className="bg-foreground/40 absolute inset-0"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "border-border bg-card relative w-full max-w-md rounded-lg border p-5 shadow-lg",
          className,
        )}
      >
        <button
          type="button"
          onClick={close}
          aria-label="关闭"
          className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-3 right-3 rounded-md p-1.5 transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="text-muted-foreground mt-1 text-sm">
            {description}
          </p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
