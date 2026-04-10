'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Laptop,
  Monitor,
  Smartphone,
  HardDrive,
  Printer,
  Wifi,
  Package,
  User,
  MapPin,
  Tag,
} from 'lucide-react'

type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired'
type AssetType = 'laptop' | 'monitor' | 'phone' | 'server' | 'printer' | 'network' | 'peripheral'

interface Asset {
  id: string
  name: string
  type: AssetType
  serialNumber: string
  status: AssetStatus
  assignedTo: string | null
  location: string
  purchaseDate: string
  warrantyExpiry: string
  value: string
}

const mockAssets: Asset[] = [
  {
    id: 'A-001',
    name: 'MacBook Pro 16"',
    type: 'laptop',
    serialNumber: 'SN-MBP-2024-001',
    status: 'assigned',
    assignedTo: 'Sarah Wilson',
    location: 'Floor 2',
    purchaseDate: 'Jan 2024',
    warrantyExpiry: 'Jan 2027',
    value: '$2,499',
  },
  {
    id: 'A-002',
    name: 'Dell UltraSharp 27"',
    type: 'monitor',
    serialNumber: 'SN-DEL-2024-002',
    status: 'assigned',
    assignedTo: 'Mike Chen',
    location: 'Floor 3',
    purchaseDate: 'Feb 2024',
    warrantyExpiry: 'Feb 2027',
    value: '$649',
  },
  {
    id: 'A-003',
    name: 'iPhone 15 Pro',
    type: 'phone',
    serialNumber: 'SN-IPH-2024-003',
    status: 'assigned',
    assignedTo: 'Admin User',
    location: 'Floor 1',
    purchaseDate: 'Mar 2024',
    warrantyExpiry: 'Mar 2026',
    value: '$999',
  },
  {
    id: 'A-004',
    name: 'Dell PowerEdge R750',
    type: 'server',
    serialNumber: 'SN-SRV-2023-004',
    status: 'maintenance',
    assignedTo: null,
    location: 'Server Room A',
    purchaseDate: 'Jun 2023',
    warrantyExpiry: 'Jun 2028',
    value: '$8,500',
  },
  {
    id: 'A-005',
    name: 'HP LaserJet Pro',
    type: 'printer',
    serialNumber: 'SN-PRT-2024-005',
    status: 'available',
    assignedTo: null,
    location: 'Floor 3',
    purchaseDate: 'Apr 2024',
    warrantyExpiry: 'Apr 2026',
    value: '$399',
  },
  {
    id: 'A-006',
    name: 'Cisco Catalyst 9300',
    type: 'network',
    serialNumber: 'SN-NET-2023-006',
    status: 'assigned',
    assignedTo: 'IT Infrastructure',
    location: 'Server Room B',
    purchaseDate: 'Aug 2023',
    warrantyExpiry: 'Aug 2028',
    value: '$4,200',
  },
  {
    id: 'A-007',
    name: 'ThinkPad X1 Carbon',
    type: 'laptop',
    serialNumber: 'SN-LEN-2024-007',
    status: 'available',
    assignedTo: null,
    location: 'IT Storage',
    purchaseDate: 'Mar 2024',
    warrantyExpiry: 'Mar 2027',
    value: '$1,899',
  },
  {
    id: 'A-008',
    name: 'LG 34" Ultrawide',
    type: 'monitor',
    serialNumber: 'SN-LG-2024-008',
    status: 'assigned',
    assignedTo: 'Jess Park',
    location: 'Floor 2',
    purchaseDate: 'Feb 2024',
    warrantyExpiry: 'Feb 2027',
    value: '$899',
  },
  {
    id: 'A-009',
    name: 'Dell OptiPlex 7010',
    type: 'laptop',
    serialNumber: 'SN-OPT-2023-009',
    status: 'retired',
    assignedTo: null,
    location: 'IT Storage',
    purchaseDate: 'Jan 2021',
    warrantyExpiry: 'Jan 2024',
    value: '$1,200',
  },
  {
    id: 'A-010',
    name: 'Ubiquiti Dream Machine',
    type: 'network',
    serialNumber: 'SN-UBI-2024-010',
    status: 'assigned',
    assignedTo: 'IT Infrastructure',
    location: 'Floor 1',
    purchaseDate: 'May 2024',
    warrantyExpiry: 'May 2026',
    value: '$379',
  },
  {
    id: 'A-011',
    name: 'Samsung Galaxy S24',
    type: 'phone',
    serialNumber: 'SN-SAM-2024-011',
    status: 'available',
    assignedTo: null,
    location: 'IT Storage',
    purchaseDate: 'Apr 2024',
    warrantyExpiry: 'Apr 2026',
    value: '$799',
  },
  {
    id: 'A-012',
    name: 'Logitech MX Master Bundle',
    type: 'peripheral',
    serialNumber: 'SN-LOG-2024-012',
    status: 'assigned',
    assignedTo: 'Alex Kim',
    location: 'Floor 3',
    purchaseDate: 'May 2024',
    warrantyExpiry: 'May 2026',
    value: '$199',
  },
]

const typeIcons: Record<AssetType, React.ElementType> = {
  laptop: Laptop,
  monitor: Monitor,
  phone: Smartphone,
  server: HardDrive,
  printer: Printer,
  network: Wifi,
  peripheral: Package,
}

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-blue-100/80 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  retired: {
    label: 'Retired',
    className: 'bg-slate-100/80 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  },
}

export default function AssetsPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'grid'>('table')

  const filtered = mockAssets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()),
  )

  const statusCounts = {
    total: mockAssets.length,
    available: mockAssets.filter((a) => a.status === 'available').length,
    assigned: mockAssets.filter((a) => a.status === 'assigned').length,
    maintenance: mockAssets.filter((a) => a.status === 'maintenance').length,
    retired: mockAssets.filter((a) => a.status === 'retired').length,
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Assets
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track and manage IT hardware inventory
          </p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl h-10 px-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Assets',
            value: statusCounts.total,
            color: 'text-slate-800 dark:text-white',
          },
          {
            label: 'Available',
            value: statusCounts.available,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Assigned',
            value: statusCounts.assigned,
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Maintenance',
            value: statusCounts.maintenance,
            color: 'text-amber-600 dark:text-amber-400',
          },
          { label: 'Retired', value: statusCounts.retired, color: 'text-slate-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assets by name, serial number, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-white/10"
          />
        </div>
        <Button
          variant="outline"
          className="rounded-xl h-10 gap-2 border-slate-200 dark:border-white/10"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'table' ? 'bg-red-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
          >
            Table
          </button>
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'grid' ? 'bg-red-600 text-white' : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800'}`}
          >
            Grid
          </button>
        </div>
      </div>

      {view === 'table' ? (
        /* Table View */
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
          <div className="hidden lg:grid grid-cols-[80px_1fr_120px_100px_140px_120px_80px_50px] gap-4 px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>ID</span>
            <span>Asset</span>
            <span>Serial</span>
            <span>Status</span>
            <span>Assigned To</span>
            <span>Location</span>
            <span>Value</span>
            <span></span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((asset) => {
              const TypeIcon = typeIcons[asset.type]
              const status = statusConfig[asset.status]
              return (
                <div
                  key={asset.id}
                  className="grid grid-cols-1 lg:grid-cols-[80px_1fr_120px_100px_140px_120px_80px_50px] gap-2 lg:gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-mono font-semibold text-red-600 dark:text-red-400">
                      {asset.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <TypeIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                        {asset.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <Tag className="h-3 w-3 shrink-0" />
                      {asset.serialNumber.slice(-7)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {asset.assignedTo ? (
                      <>
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {asset.assignedTo}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {asset.location}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {asset.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset) => {
            const TypeIcon = typeIcons[asset.type]
            const status = statusConfig[asset.status]
            return (
              <div
                key={asset.id}
                className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <TypeIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1 truncate">
                  {asset.name}
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono font-semibold mb-3">
                  {asset.id}
                </p>
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{asset.assignedTo || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>{asset.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {asset.value}
                    </span>
                    <span className="text-slate-400">{asset.warrantyExpiry}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Showing {filtered.length} of {mockAssets.length} assets
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
