import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "@/components/clients/map";
import type { Territory } from "@/lib/types";

export async function TerritoryPanel({ territories }: { territories: Territory[] }) {
  const tr = await getTranslations("clients");
  const max = Math.max(...territories.map((t) => t.clients), 1);
  const markers = territories
    .filter((t) => t.clients > 0)
    .map((t) => ({
      lat: t.lat,
      lng: t.lng,
      label: t.region,
      sub: tr("territoryMarker", { clients: t.clients, pct: t.pct }),
      radius: 7 + (t.clients / max) * 15,
    }));

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{tr("byTerritory")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[320px]">
          <Map center={[40.74, -73.97]} zoom={11} markers={markers} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-medium">{tr("colRegion")}</th>
                <th className="pb-2 text-end font-medium">{tr("colClients")}</th>
                <th className="pb-2 text-end font-medium">{tr("colShare")}</th>
              </tr>
            </thead>
            <tbody>
              {territories.map((t) => (
                <tr key={t.region} className="border-t">
                  <td className="py-2">{t.region}</td>
                  <td className="py-2 text-end font-mono tabular">{t.clients}</td>
                  <td className="py-2 text-end">
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
