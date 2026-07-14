import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "@/components/clients/map";
import type { Territory } from "@/lib/types";

export function TerritoryPanel({ territories }: { territories: Territory[] }) {
  const max = Math.max(...territories.map((t) => t.clients), 1);
  const markers = territories
    .filter((t) => t.clients > 0)
    .map((t) => ({
      lat: t.lat,
      lng: t.lng,
      label: t.region,
      sub: `${t.clients} clients · ${t.pct}%`,
      radius: 7 + (t.clients / max) * 15,
    }));

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Clients by territory</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[320px]">
          <Map center={[40.74, -73.97]} zoom={11} markers={markers} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-medium">Region</th>
                <th className="pb-2 text-right font-medium">Clients</th>
                <th className="pb-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {territories.map((t) => (
                <tr key={t.region} className="border-t">
                  <td className="py-2">{t.region}</td>
                  <td className="py-2 text-right font-mono tabular">{t.clients}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(t.clients / max) * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-xs tabular text-muted-foreground">
                        {t.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
