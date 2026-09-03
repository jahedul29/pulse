"use client";

import { CalendarDays, Globe, MapPin, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "@/components/clients/map";
import { ServiceBalanceCard } from "@/components/clients/service-balance-card";
import { StatusBadge } from "@/components/common/status-badge";
import { fmtDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

function Meta({
  icon: Icon,
  children,
}: {
  icon: typeof Globe;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

export function ProfileTabs({ profiles }: { profiles: Profile[] }) {
  const t = useTranslations("clients");
  const locale = useLocale();
  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {t("profile.noProfiles")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={profiles[0].id} className="gap-4">
      <TabsList className="flex-wrap">
        {profiles.map((profile) => (
          <TabsTrigger key={profile.id} value={profile.id}>
            {profile.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {profiles.map((profile) => (
        <TabsContent key={profile.id} value={profile.id} className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{profile.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("profile.meta", {
                    gender: t(`form.gender${profile.gender}`),
                    age: profile.age,
                    date: fmtDate(profile.createdAt, locale),
                  })}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                <Meta icon={Globe}>
                  {profile.primaryLanguage}
                  {profile.secondaryLanguage ? ` · ${profile.secondaryLanguage}` : ""}
                </Meta>
                <Meta icon={MapPin}>
                  {profile.location.address}, {profile.location.region}
                </Meta>
                <Meta icon={Video}>
                  {profile.onlineAvailable
                    ? t("profile.onlineAvailable")
                    : t("profile.onlineUnavailable")}
                </Meta>
                <Meta icon={CalendarDays}>{t("profile.dobLabel", { date: fmtDate(profile.dob, locale) })}</Meta>
                <div className="mt-1 flex flex-col gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("profile.assignedSpecialists")}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {profile.specialists.map((specialist) => (
                      <div key={specialist.type} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{specialist.type}</span>
                        <span className="flex items-center gap-2">
                          <span>{specialist.name}</span>
                          <StatusBadge tone={specialist.active ? "success" : "neutral"}>
                            {specialist.active ? t("profile.active") : t("profile.inactive")}
                          </StatusBadge>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>{t("profile.location")}</CardTitle>
                <p className="text-xs text-muted-foreground">{profile.location.region}</p>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <Map
                    center={[profile.location.lat, profile.location.lng]}
                    zoom={13}
                    markers={[
                      {
                        lat: profile.location.lat,
                        lng: profile.location.lng,
                        label: profile.name,
                        sub: profile.location.region,
                        radius: 11,
                      },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {t("profile.serviceBalances")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {profile.balances.map((balance) => (
                <ServiceBalanceCard key={balance.key} balance={balance} />
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.serviceUsageHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-xs tracking-wide text-muted-foreground uppercase">
                      <th className="pb-2 font-medium">{t("profile.colScope")}</th>
                      <th className="pb-2 text-end font-medium">{t("profile.colCompleted")}</th>
                      <th className="pb-2 text-end font-medium">{t("profile.colScheduled")}</th>
                      <th className="pb-2 text-end font-medium">{t("profile.colCanceled")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.usage.map((usageRow) => (
                      <tr key={usageRow.scope} className="border-t">
                        <td className="py-2">{usageRow.scope}</td>
                        <td className="py-2 text-end font-mono tabular">{usageRow.completed}</td>
                        <td className="py-2 text-end font-mono tabular">{usageRow.scheduled}</td>
                        <td className="py-2 text-end font-mono tabular">{usageRow.canceled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
