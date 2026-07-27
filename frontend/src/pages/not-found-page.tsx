import { Link } from "react-router-dom";

import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="tnum text-muted-foreground text-4xl font-semibold">404</p>
      <p className="text-muted-foreground">页面不存在。</p>
      <Link
        to="/dashboard"
        className={buttonVariants({ variant: "secondary" })}
      >
        回到总览
      </Link>
    </div>
  );
}
