'use client'

import { AreaChart, BarChart, DonutChart } from '@tremor/react'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react'

// Tailwind v4 safelist for dynamic Tremor color classes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safelist =
  'bg-fuchsia-500 text-fuchsia-500 fill-fuchsia-500 stroke-fuchsia-500 bg-cyan-500 text-cyan-500 fill-cyan-500 stroke-cyan-500 bg-sky-500 text-sky-500 fill-sky-500 stroke-sky-500 bg-amber-500 text-amber-500 fill-amber-500 stroke-amber-500 bg-emerald-500 text-emerald-500 fill-emerald-500 stroke-emerald-500 bg-violet-500 text-violet-500 fill-violet-500 stroke-violet-500 bg-rose-500 text-rose-500 fill-rose-500 stroke-rose-500'

const ticketsByMonth = [
  { month: 'Oct', Created: 38, Resolved: 35, Overdue: 3 },
  { month: 'Nov', Created: 45, Resolved: 42, Overdue: 5 },
  { month: 'Dec', Created: 32, Resolved: 30, Overdue: 2 },
  { month: 'Jan', Created: 52, Resolved: 48, Overdue: 6 },
  { month: 'Feb', Created: 48, Resolved: 50, Overdue: 4 },
  { month: 'Mar', Created: 61, Resolved: 55, Overdue: 8 },
]

const resolutionTimeData = [
  { category: 'Hardware', 'Avg Hours': 18 },
  { category: 'Software', 'Avg Hours': 8 },
  { category: 'Network', 'Avg Hours': 12 },
  { category: 'Access', 'Avg Hours': 4 },
  { category: 'Security', 'Avg Hours': 24 },
  { category: 'Infrastructure', 'Avg Hours': 36 },
]

const assetsByStatus = [
  { name: 'Assigned', value: 340 },
  { name: 'Available', value: 85 },
  { name: 'Maintenance', value: 22 },
  { name: 'Retired', value: 53 },
]

const staffPerformance = [
  { name: 'Mike Chen', Resolved: 45, 'Avg Time (h)': 14 },
  { name: 'Alex Kim', Resolved: 38, 'Avg Time (h)': 10 },
  { name: 'Jess Park', Resolved: 52, 'Avg Time (h)': 8 },
]

const kpis = [
  {
    label: 'Avg Resolution Time',
    value: '14.2h',
    change: '-2.3h',
    trend: 'down' as const,
    good: true,
  },
  { label: 'First Response Time', value: '28m', change: '-5m', trend: 'down' as const, good: true },
  { label: 'Open Tickets', value: '12', change: '+2', trend: 'up' as const, good: false },
  { label: 'SLA Compliance', value: '94.5%', change: '+1.2%', trend: 'up' as const, good: true },
  {
    label: 'Customer Satisfaction',
    value: '4.6/5',
    change: '0.0',
    trend: 'flat' as const,
    good: true,
  },
  {
    label: 'Total Assets Value',
    value: '$485K',
    change: '+$23K',
    trend: 'up' as const,
    good: true,
  },
]

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analytics and insights for IT operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl h-10 gap-2 border-slate-200 dark:border-white/10"
          >
            <Calendar className="h-4 w-4" />
            Last 6 Months
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-xl h-10 px-4 gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const TrendIcon =
            kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                {kpi.label}
              </p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{kpi.value}</p>
              <div
                className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                  kpi.good
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{kpi.change}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Ticket Volume Trend
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Created vs resolved tickets per month
              </p>
            </div>
            <div className="p-5 flex-1">
              <AreaChart
                className="h-72 w-full"
                data={ticketsByMonth}
                index="month"
                categories={['Created', 'Resolved', 'Overdue']}
                colors={['fuchsia', 'cyan', 'rose']}
                yAxisWidth={40}
                showAnimation
                showGridLines
                curveType="natural"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Asset Distribution
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Current inventory by status
              </p>
            </div>
            <div className="p-5 flex-1 flex flex-col items-center justify-center">
              <DonutChart
                className="h-56 w-full"
                data={assetsByStatus}
                category="value"
                index="name"
                colors={['sky', 'emerald', 'amber', 'violet']}
                valueFormatter={(n) => Intl.NumberFormat('us').format(n).toString()}
                showAnimation
              />
              <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                {assetsByStatus.map((item, i) => {
                  const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500']
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i]}`} />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-white ml-auto">
                        {item.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Resolution Time by Category
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Average hours to resolve by ticket type
            </p>
          </div>
          <div className="p-5 flex-1">
            <BarChart
              className="h-64 w-full"
              data={resolutionTimeData}
              index="category"
              categories={['Avg Hours']}
              colors={['fuchsia']}
              yAxisWidth={50}
              showAnimation
              showGridLines
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Staff Performance
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tickets resolved and avg resolution time
            </p>
          </div>
          <div className="p-5 flex-1">
            <BarChart
              className="h-64 w-full"
              data={staffPerformance}
              index="name"
              categories={['Resolved', 'Avg Time (h)']}
              colors={['cyan', 'amber']}
              yAxisWidth={40}
              showAnimation
              showGridLines
            />
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 p-5">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: 'Monthly Ticket Summary',
              desc: 'All tickets created and resolved this month',
              icon: BarChart3,
            },
            {
              title: 'Asset Inventory Report',
              desc: 'Complete list of all assets with status',
              icon: FileText,
            },
            {
              title: 'User Activity Log',
              desc: 'Login history and actions per user',
              icon: FileText,
            },
            {
              title: 'SLA Compliance Report',
              desc: 'Ticket resolution times vs SLA targets',
              icon: BarChart3,
            },
          ].map((report) => (
            <button
              key={report.title}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-all group"
            >
              <report.icon className="h-5 w-5 text-red-600 dark:text-red-400 mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {report.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{report.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
