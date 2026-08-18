"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { kpis } from "@/lib/mock/data";
import { PERIODS, DEFAULT_PERIOD } from "@/lib/period";
import type { Period } from "@/lib/types";
import { roundedCurve } from "@/lib/chart-curve";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/common/toggle-switch";

const METRIC_KEYS = kpis.map((k) => k.key);
const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
type ChartType = "line" | "bar" | "pie";

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

export function MetricChartPanel() {
  const t = useTranslations("clients");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [type, setType] = useState<ChartType>("line");
  const [m1, setM1] = useState("new");
  const [m2, setM2] = useState("total");
  const [showData, setShowData] = useState(true);

  const k1 = kpis.find((k) => k.key === m1) ?? kpis[0];
  const k2 = m2 === "none" ? null : (kpis.find((k) => k.key === m2) ?? null);
  const name1 = t(`metric.${m1}`);
  const name2 = k2 ? t(`metric.${m2}`) : "";

  const data = useMemo(() => {
    const a = k1.trends[period];
    const b = k2?.trends[period];
    return a.map((p, i) => ({ label: p.label, m1: p.value, m2: b ? b[i]?.value : undefined }));
  }, [k1, k2, period]);

  const pieData = [
    { name: name1, value: k1.values[period] },
    ...(k2 ? [{ name: name2, value: k2.values[period] }] : []),
  ];

  const metricSelect = (value: string, onChange: (v: string) => void, withNone?: boolean) => (
    <Select value={value} onValueChange={(v) => onChange(v ?? value)}>
      <SelectTrigger className="h-9 w-[190px]">
        <SelectValue>{(v) => (v === "none" ? t("chartPanel.none") : t(`metric.${v}`))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {withNone && <SelectItem value="none">{t("chartPanel.none")}</SelectItem>}
        {METRIC_KEYS.map((k) => (
          <SelectItem key={k} value={k}>
            {t(`metric.${k}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>{t("chartPanel.title")}</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <Ctl label={t("chartPanel.metric1")}>{metricSelect(m1, setM1)}</Ctl>
          <Ctl label={t("chartPanel.metric2")}>{metricSelect(m2, setM2, true)}</Ctl>
          <Ctl label={t("chartPanel.type")}>
            <Select value={type} onValueChange={(v) => setType((v as ChartType) ?? "line")}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue>{(v) => t(`chartPanel.${v}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">{t("chartPanel.line")}</SelectItem>
                <SelectItem value="bar">{t("chartPanel.bar")}</SelectItem>
                <SelectItem value="pie">{t("chartPanel.pie")}</SelectItem>
              </SelectContent>
            </Select>
          </Ctl>
          <Ctl label={t("chartPanel.period")}>
            <Select value={period} onValueChange={(v) => setPeriod((v as Period) ?? DEFAULT_PERIOD)}>
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue>{(v) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Ctl>
          <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={showData}
              onCheckedChange={setShowData}
              aria-label={t("chartPanel.dataBox")}
            />
            {t("chartPanel.dataBox")}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "grid grid-cols-1 gap-4 transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none",
            showData ? "lg:grid-cols-[1fr_220px]" : "lg:grid-cols-[1fr_0px]",
          )}
        >
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              {type === "pie" ? (
                <PieChart>
                  <Tooltip formatter={(v) => fmtNumber(Number(v))} />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    <Cell fill={C1} />
                    {k2 && <Cell fill={C2} />}
                  </Pie>
                </PieChart>
              ) : type === "bar" ? (
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} strokeDasharray="4 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} tickMargin={8} />
                  <YAxis yAxisId="l" width={44} tickLine={false} axisLine={false} tick={axis} />
                  {k2 && <YAxis yAxisId="r" orientation="right" width={44} tickLine={false} axisLine={false} tick={axis} />}
                  <Tooltip formatter={(v) => fmtNumber(Number(v))} cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="m1" name={name1} fill={C1} radius={[4, 4, 0, 0]} />
                  {k2 && <Bar yAxisId="r" dataKey="m2" name={name2} fill={C2} radius={[4, 4, 0, 0]} />}
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} strokeDasharray="4 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} tickMargin={8} />
                  <YAxis yAxisId="l" width={44} tickLine={false} axisLine={false} tick={axis} />
                  {k2 && <YAxis yAxisId="r" orientation="right" width={44} tickLine={false} axisLine={false} tick={axis} />}
                  <Tooltip formatter={(v) => fmtNumber(Number(v))} />
                  <Legend />
                  <Line yAxisId="l" dataKey="m1" name={name1} stroke={C1} strokeWidth={2.5} type={roundedCurve(10)} dot={false} />
                  {k2 && <Line yAxisId="r" dataKey="m2" name={name2} stroke={C2} strokeWidth={2.5} type={roundedCurve(10)} dot={false} />}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div
            aria-hidden={!showData}
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
              showData ? "max-h-96 opacity-100" : "max-h-0 opacity-0 lg:max-h-96",
            )}
          >
            <div className="flex h-full flex-col gap-4 rounded-xl border bg-muted/40 p-3">
              <DataRow color={C1} name={name1} value={k1.values[period]} delta={k1.deltas[period]} />
              {k2 && <DataRow color={C2} name={name2} value={k2.values[period]} delta={k2.deltas[period]} />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Ctl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DataRow({
  color,
  name,
  value,
  delta,
}: {
  color: string;
  name: string;
  value: number;
  delta: number;
}) {
  const good = delta >= 0;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        {name}
      </span>
      <span className="font-heading text-2xl font-semibold tabular">{fmtNumber(value)}</span>
      <span
        className={cn(
          "w-fit rounded-full px-1.5 py-0.5 font-mono text-xs font-medium",
          good ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground",
        )}
      >
        {good ? "+" : ""}
        {delta}%
      </span>
    </div>
  );
}
