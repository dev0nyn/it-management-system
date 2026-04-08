import React from 'react';

// Using server component (default)
export default async function DashboardPage() {
  // Simulating data fetching
  const stats = [
    { name: 'Active Tickets', value: '12', description: '+2 from yesterday', status: 'urgent' },
    { name: 'Assigned Assets', value: '85%', description: 'Laptops & Monitors', status: 'good' },
    { name: 'System Health', value: 'Healthy', description: 'All servers online', status: 'good' },
    { name: 'Pending Approvals', value: '3', description: '2 Assets, 1 Ticket', status: 'warning' },
  ];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">IT Management Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* Sample Shadcn Button using Tailwind utility classes */}
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 bg-blue-600 text-white shadow-lg hover:bg-blue-700">
            Download Report
          </button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-xl border bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 transition-all hover:shadow-md hover:scale-[1.02]">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</h3>
              <div className={`h-2 w-2 rounded-full ${stat.status === 'urgent' ? 'bg-red-500 animate-pulse' : stat.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Recent Tickets</h3>
          <div className="space-y-4">
            {/* List of tickets would go here */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 border-b border-slate-50 dark:border-slate-700 pb-4 last:border-0 last:pb-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-200 font-bold">
                  T{i}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none text-slate-800 dark:text-white">Broken monitor in Room 10{i}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requested by user_{i}@company.com</p>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Open
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="col-span-3 rounded-xl border bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Asset Alerts</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 underline decoration-blue-500/30">
            Click here to view all urgent maintenance alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
