'use client'

import React from 'react'
import { AreaChart, DonutChart, BarChart } from '@tremor/react'

// Tailwind v4 safelist for dynamic Tremor color classes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safelist =
  'bg-fuchsia-500 text-fuchsia-500 fill-fuchsia-500 stroke-fuchsia-500 bg-cyan-500 text-cyan-500 fill-cyan-500 stroke-cyan-500 bg-sky-500 text-sky-500 fill-sky-500 stroke-sky-500 bg-amber-500 text-amber-500 fill-amber-500 stroke-amber-500 bg-emerald-500 text-emerald-500 fill-emerald-500 stroke-emerald-500 bg-violet-500 text-violet-500 fill-violet-500 stroke-violet-500'

const ticketData = [
  { date: 'Jan 22', Tickets: 45, Resolved: 30 },
  { date: 'Feb 22', Tickets: 52, Resolved: 48 },
  { date: 'Mar 22', Tickets: 48, Resolved: 50 },
  { date: 'Apr 22', Tickets: 61, Resolved: 55 },
  { date: 'May 22', Tickets: 59, Resolved: 55 },
  { date: 'Jun 22', Tickets: 67, Resolved: 65 },
  { date: 'Jul 22', Tickets: 71, Resolved: 68 },
]

const assetData = [
  { name: 'Laptops', value: 340 },
  { name: 'Monitors', value: 280 },
  { name: 'Phones', value: 120 },
  { name: 'Peripherals', value: 180 },
]

const serverUptimeData = [
  { time: '00:00', load: 35, latency: 12 },
  { time: '04:00', load: 12, latency: 8 },
  { time: '08:00', load: 65, latency: 25 },
  { time: '12:00', load: 85, latency: 45 },
  { time: '16:00', load: 70, latency: 30 },
  { time: '20:00', load: 45, latency: 18 },
  { time: '23:59', load: 30, latency: 15 },
]

export default function DashboardPage() {
  const stats = [
    { name: 'Active Tickets', value: '12', description: '+2 from yesterday', status: 'urgent' },
    { name: 'Assigned Assets', value: '85%', description: 'Laptops & Monitors', status: 'good' },
    { name: 'System Health', value: '99.9%', description: 'All servers online', status: 'good' },
    { name: 'Pending Approvals', value: '3', description: '2 Assets, 1 Ticket', status: 'warning' },
  ]

  return (
    <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 pt-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-1">
            Dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Overview of your IT infrastructure and support.
          </p>
        </div>
        <div className="flex items-center w-full sm:w-auto">
          <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-red-600 text-white hover:bg-red-700 h-10 py-2 px-4 hover:shadow-lg active:scale-95">
            Download Report
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 transition-all hover:shadow-md hover:-translate-y-1 group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent dark:from-red-900/20 rounded-bl-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {stat.name}
              </h3>
              <div
                className={`h-2.5 w-2.5 rounded-full shadow-sm shrink-0 ${stat.status === 'urgent' ? 'bg-red-500 animate-pulse shadow-red-500/50' : stat.status === 'warning' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`}
              />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <div className="relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Tickets vs Resolved
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Monthly IT support request volume
              </p>
            </div>
            <div className="p-4 sm:p-6 flex-1 w-full overflow-hidden">
              <AreaChart
                className="h-64 sm:h-72 mt-2 sm:mt-4 w-full"
                data={ticketData}
                index="date"
                categories={['Tickets', 'Resolved']}
                colors={['fuchsia', 'cyan']}
                yAxisWidth={45}
                showAnimation={true}
                showGridLines={true}
                curveType="natural"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Asset Distribution
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Current hardware allocation
              </p>
            </div>
            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center">
              <DonutChart
                className="h-48 sm:h-64 mt-2 sm:mt-4 w-full"
                data={assetData}
                category="value"
                index="name"
                colors={['sky', 'fuchsia', 'amber', 'emerald']}
                valueFormatter={(number) => Intl.NumberFormat('us').format(number).toString()}
                showAnimation={true}
              />
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full px-2 sm:px-0">
                {assetData.map((item, i) => {
                  const colors = ['bg-sky-500', 'bg-fuchsia-500', 'bg-amber-500', 'bg-emerald-500']
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${colors[i % colors.length]}`}
                      ></span>
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate">
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white ml-auto">
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

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-3">
          <div className="relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Server Network Status
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Daily server load & latency monitoring
              </p>
            </div>
            <div className="p-4 sm:p-6 flex-1 w-full overflow-hidden">
              <BarChart
                className="h-64 sm:h-72 mt-2 sm:mt-4 w-full"
                data={serverUptimeData}
                index="time"
                categories={['load', 'latency']}
                colors={['violet', 'amber']}
                yAxisWidth={40}
                showAnimation={true}
                showGridLines={true}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Recent Tickets
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Latest issues reported by users
                </p>
              </div>
              <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium self-start sm:self-auto bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
                View All
              </button>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              <div className="divide-y divide-slate-100 dark:divide-slate-800 min-w-[280px]">
                {[
                  {
                    id: 'T-1029',
                    title: 'Broken monitor in Room 101',
                    user: 'j.smith@company.com',
                    status: 'Open',
                    time: '2h ago',
                  },
                  {
                    id: 'T-1028',
                    title: 'VPN connection failing',
                    user: 'a.jones@company.com',
                    status: 'In Progress',
                    time: '4h ago',
                  },
                  {
                    id: 'T-1027',
                    title: 'Need access to Marketing drive',
                    user: 'm.doe@company.com',
                    status: 'Resolved',
                    time: '1d ago',
                  },
                  {
                    id: 'T-1026',
                    title: 'Laptop battery draining fast',
                    user: 's.taylor@company.com',
                    status: 'Open',
                    time: '1d ago',
                  },
                ].map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                        {ticket.id.split('-')[1]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-none text-slate-800 dark:text-white truncate pb-1.5">
                          {ticket.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {ticket.user}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center sm:flex-col justify-between sm:justify-center gap-2 sm:gap-1 pl-13 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-50 dark:border-slate-800/50">
                      <div
                        className={`text-[11px] font-semibold px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap 
                        ${
                          ticket.status === 'Open'
                            ? 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : ticket.status === 'In Progress'
                              ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                              : 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        }`}
                      >
                        {ticket.status}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {ticket.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
