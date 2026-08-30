'use client';
import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type ChartType = 'area' | 'bar' | 'line' | 'pie';

interface RevenueChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  xKey: string;
  title?: string;
  chartType?: ChartType;
  color?: string;
  secondaryDataKey?: string;
  secondaryColor?: string;
  height?: number;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
}

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
];

const defaultFormat = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

function TooltipDot({ color }: { color: string }) {
  const ref = React.useCallback(
    (node: HTMLSpanElement | null) => {
      if (node) node.style.backgroundColor = color;
    },
    [color],
  );
  return <span ref={ref} className="w-2 h-2 rounded-full" />;
}

function CustomTooltip({ active, payload, label, formatValue }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <TooltipDot color={p.color} />
          <span className="text-slate-500">{p.dataKey}:</span>
          <span className="font-bold text-slate-900">
            {(formatValue || defaultFormat)(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart({
  data,
  dataKey,
  xKey,
  title,
  chartType = 'area',
  color = '#10b981',
  secondaryDataKey,
  secondaryColor = '#3b82f6',
  height = 280,
  showLegend = false,
  formatValue,
}: RevenueChartProps) {
  const [activeType, setActiveType] = useState<ChartType>(chartType);

  const toggleTypes: ChartType[] = ['area', 'bar', 'line'];

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 10, left: -10, bottom: 0 },
    };

    const commonAxisProps = {
      xAxis: (
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
      ),
      yAxis: (
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (formatValue || defaultFormat)(v)}
        />
      ),
      grid: <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />,
      tooltip: (
        <Tooltip
          content={<CustomTooltip formatValue={formatValue} />}
          cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
        />
      ),
      legend: showLegend ? <Legend /> : null,
    };

    if (activeType === 'pie') {
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={height / 3}
            innerRadius={height / 5}
            dataKey={dataKey}
            nameKey={xKey}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs font-semibold text-slate-600">{value}</span>
            )}
          />
        </PieChart>
      );
    }

    if (activeType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {commonAxisProps.grid}
          {commonAxisProps.xAxis}
          {commonAxisProps.yAxis}
          {commonAxisProps.tooltip}
          {commonAxisProps.legend}
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          {secondaryDataKey && (
            <Bar
              dataKey={secondaryDataKey}
              fill={secondaryColor}
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          )}
        </BarChart>
      );
    }

    if (activeType === 'line') {
      return (
        <LineChart {...commonProps}>
          {commonAxisProps.grid}
          {commonAxisProps.xAxis}
          {commonAxisProps.yAxis}
          {commonAxisProps.tooltip}
          {commonAxisProps.legend}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: color }}
          />
          {secondaryDataKey && (
            <Line
              type="monotone"
              dataKey={secondaryDataKey}
              stroke={secondaryColor}
              strokeWidth={2.5}
              dot={{ r: 4, fill: secondaryColor, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: secondaryColor }}
            />
          )}
        </LineChart>
      );
    }

    // Default: area
    return (
      <AreaChart {...commonProps}>
        {commonAxisProps.grid}
        {commonAxisProps.xAxis}
        {commonAxisProps.yAxis}
        {commonAxisProps.tooltip}
        {commonAxisProps.legend}
        <defs>
          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {secondaryDataKey && (
            <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill="url(#colorPrimary)"
          dot={{ r: 3, fill: color, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 5, fill: color }}
        />
        {secondaryDataKey && (
          <Area
            type="monotone"
            dataKey={secondaryDataKey}
            stroke={secondaryColor}
            strokeWidth={2.5}
            fill="url(#colorSecondary)"
            dot={{ r: 3, fill: secondaryColor, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5, fill: secondaryColor }}
          />
        )}
      </AreaChart>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="text-base font-black text-slate-900">{title}</h3>}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {toggleTypes.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                activeType === t
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'area' ? 'Area' : t === 'bar' ? 'Bar' : 'Line'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
