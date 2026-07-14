import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/clients/kpi-card";
import { TrendChart } from "@/components/clients/trend-chart";
import { Donut } from "@/components/clients/donut";
import { TerritoryPanel } from "@/components/clients/territory-panel";
import { ClientTable } from "@/components/clients/client-table";
import {
  cancellationSplit,
  kpis,
  packageSplit,
  supervisionSplit,
  territories,
} from "@/lib/mock/data";
import { coercePeriod, PERIOD_LABEL } from "@/lib/period";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = coercePeriod((await searchParams).period);
  const newTrend = kpis.find((k) => k.key === "new")?.trends[period] ?? [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} period={period} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New clients</CardTitle>
            <p className="text-xs text-muted-foreground">{PERIOD_LABEL[period]}</p>
          </CardHeader>
          <CardContent>
            <TrendChart data={newTrend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active packages</CardTitle>
            <p className="text-xs text-muted-foreground">Split by recurrence</p>
          </CardHeader>
          <CardContent>
            <Donut data={packageSplit} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessions by supervision</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut data={supervisionSplit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancellations by reason</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut data={cancellationSplit} />
          </CardContent>
        </Card>
      </section>

      <TerritoryPanel territories={territories} />

      <Card>
        <CardHeader>
          <CardTitle>Client accounts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Search any attribute · select a row to open the account
          </p>
        </CardHeader>
        <CardContent>
          <ClientTable />
        </CardContent>
      </Card>
    </div>
  );
}
