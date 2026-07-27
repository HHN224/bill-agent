import { Link } from "react-router-dom";

import { useDailySummary, useMonthlySummary } from "@/api/hooks";
import { CategoryDonut } from "@/components/charts/category-donut";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

function MetricCard({
  title,
  value,
  hint,
  emphasize,
}: {
  title: string;
  value: string;
  hint?: string;
  emphasize?: "success" | "default";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "tnum text-2xl font-semibold tracking-tight",
            emphasize === "success" && "text-success",
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const daily = useDailySummary();
  const monthly = useMonthlySummary(year, month);

  const hasFailure = daily.isError || monthly.isError;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="总览"
        description={`${year} 年 ${month} 月 · 统计由后端实时计算`}
      />

      {hasFailure ? (
        <ErrorState
          error={daily.error ?? monthly.error}
          onRetry={() => {
            void daily.refetch();
            void monthly.refetch();
          }}
        />
      ) : (
        <>
          <section aria-label="今日与本月指标">
            {daily.isPending || monthly.isPending ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <MetricSkeleton key={index} />
                ))}
              </div>
            ) : daily.data && monthly.data ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <MetricCard
                  title="今日支出"
                  value={formatAmount(daily.data.expense_total)}
                  hint={`今日共 ${daily.data.transaction_count} 笔`}
                />
                <MetricCard
                  title="今日收入"
                  value={formatAmount(daily.data.income_total)}
                  emphasize="success"
                />
                <MetricCard
                  title="本月支出"
                  value={formatAmount(monthly.data.expense_total)}
                  hint={`本月共 ${monthly.data.transaction_count} 笔`}
                />
                <MetricCard
                  title="本月净额"
                  value={formatAmount(monthly.data.net_amount)}
                  hint={`收入 ${formatAmount(monthly.data.income_total)}`}
                  emphasize={
                    monthly.data.net_amount >= 0 ? "success" : "default"
                  }
                />
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>本月每日支出</CardTitle>
              </CardHeader>
              <CardContent>
                {monthly.isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : monthly.data ? (
                  <MonthlyTrendChart
                    dailyTotals={monthly.data.daily_totals}
                    year={year}
                    month={month}
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>本月支出分类</CardTitle>
              </CardHeader>
              <CardContent>
                {monthly.isPending ? (
                  <Skeleton className="h-52 w-full" />
                ) : monthly.data ? (
                  <CategoryDonut
                    categories={monthly.data.categories}
                    total={monthly.data.expense_total}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>

          {monthly.data && monthly.data.transaction_count === 0 ? (
            <div className="flex justify-center">
              <Link
                to="/transactions/new"
                className={buttonVariants({ variant: "secondary" })}
              >
                记录第一笔交易
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
