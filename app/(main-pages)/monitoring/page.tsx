'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowUpDown,
  Signal,
  Zap,
  Shield,
} from 'lucide-react'

type DeviceStatus = 'online' | 'offline' | 'degraded' | 'maintenance'

interface Device {
  id: string
  name: string
  type: 'server' | 'switch' | 'router' | 'firewall' | 'ap'
  ip: string
  status: DeviceStatus
  uptime: string
  latency: string
  lastCheck: string
  cpu: number
  memory: number
  location: string
}

interface Alert {
  id: string
  device: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  time: string
  acknowledged: boolean
}

const mockDevices: Device[] = [
  {
    id: 'D-001',
    name: 'web-prod-01',
    type: 'server',
    ip: '10.0.1.10',
    status: 'online',
    uptime: '45d 12h',
    latency: '2ms',
    lastCheck: '15s ago',
    cpu: 42,
    memory: 67,
    location: 'DC-1 Rack A',
  },
  {
    id: 'D-002',
    name: 'web-prod-02',
    type: 'server',
    ip: '10.0.1.11',
    status: 'online',
    uptime: '45d 12h',
    latency: '3ms',
    lastCheck: '15s ago',
    cpu: 38,
    memory: 54,
    location: 'DC-1 Rack A',
  },
  {
    id: 'D-003',
    name: 'db-primary',
    type: 'server',
    ip: '10.0.2.10',
    status: 'online',
    uptime: '120d 8h',
    latency: '1ms',
    lastCheck: '10s ago',
    cpu: 65,
    memory: 82,
    location: 'DC-1 Rack B',
  },
  {
    id: 'D-004',
    name: 'db-replica',
    type: 'server',
    ip: '10.0.2.11',
    status: 'degraded',
    uptime: '30d 6h',
    latency: '45ms',
    lastCheck: '10s ago',
    cpu: 89,
    memory: 91,
    location: 'DC-1 Rack B',
  },
  {
    id: 'D-005',
    name: 'core-switch-01',
    type: 'switch',
    ip: '10.0.0.1',
    status: 'online',
    uptime: '200d 4h',
    latency: '1ms',
    lastCheck: '30s ago',
    cpu: 15,
    memory: 32,
    location: 'DC-1 MDF',
  },
  {
    id: 'D-006',
    name: 'core-switch-02',
    type: 'switch',
    ip: '10.0.0.2',
    status: 'online',
    uptime: '200d 4h',
    latency: '1ms',
    lastCheck: '30s ago',
    cpu: 18,
    memory: 28,
    location: 'DC-1 MDF',
  },
  {
    id: 'D-007',
    name: 'edge-router',
    type: 'router',
    ip: '10.0.0.254',
    status: 'online',
    uptime: '90d 2h',
    latency: '5ms',
    lastCheck: '20s ago',
    cpu: 22,
    memory: 45,
    location: 'DC-1 MDF',
  },
  {
    id: 'D-008',
    name: 'fw-primary',
    type: 'firewall',
    ip: '10.0.0.100',
    status: 'online',
    uptime: '60d 18h',
    latency: '2ms',
    lastCheck: '15s ago',
    cpu: 35,
    memory: 50,
    location: 'DC-1 MDF',
  },
  {
    id: 'D-009',
    name: 'backup-server',
    type: 'server',
    ip: '10.0.3.10',
    status: 'offline',
    uptime: '0d 0h',
    latency: '-',
    lastCheck: '5m ago',
    cpu: 0,
    memory: 0,
    location: 'DC-2 Rack A',
  },
  {
    id: 'D-010',
    name: 'floor3-ap-01',
    type: 'ap',
    ip: '10.0.10.1',
    status: 'online',
    uptime: '15d 22h',
    latency: '8ms',
    lastCheck: '45s ago',
    cpu: 12,
    memory: 25,
    location: 'Floor 3',
  },
  {
    id: 'D-011',
    name: 'mail-server',
    type: 'server',
    ip: '10.0.4.10',
    status: 'maintenance',
    uptime: '0d 0h',
    latency: '-',
    lastCheck: '2h ago',
    cpu: 0,
    memory: 0,
    location: 'DC-1 Rack C',
  },
  {
    id: 'D-012',
    name: 'vpn-gateway',
    type: 'router',
    ip: '10.0.0.200',
    status: 'online',
    uptime: '75d 10h',
    latency: '12ms',
    lastCheck: '20s ago',
    cpu: 28,
    memory: 40,
    location: 'DC-1 MDF',
  },
]

const mockAlerts: Alert[] = [
  {
    id: 'AL-001',
    device: 'db-replica',
    message: 'High CPU usage (89%) — threshold exceeded for 10 minutes',
    severity: 'critical',
    time: '2m ago',
    acknowledged: false,
  },
  {
    id: 'AL-002',
    device: 'backup-server',
    message: 'Device unreachable — 3 consecutive health check failures',
    severity: 'critical',
    time: '5m ago',
    acknowledged: false,
  },
  {
    id: 'AL-003',
    device: 'db-replica',
    message: 'Memory usage at 91% — approaching capacity limit',
    severity: 'warning',
    time: '8m ago',
    acknowledged: false,
  },
  {
    id: 'AL-004',
    device: 'mail-server',
    message: 'Scheduled maintenance window started',
    severity: 'info',
    time: '2h ago',
    acknowledged: true,
  },
  {
    id: 'AL-005',
    device: 'web-prod-01',
    message: 'Latency spike detected (120ms) — auto-recovered',
    severity: 'warning',
    time: '4h ago',
    acknowledged: true,
  },
  {
    id: 'AL-006',
    device: 'floor3-ap-01',
    message: 'Wireless AP rebooted unexpectedly',
    severity: 'warning',
    time: '1d ago',
    acknowledged: true,
  },
]

const statusConfig: Record<DeviceStatus, { label: string; className: string; dotClass: string }> = {
  online: {
    label: 'Online',
    className: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500 shadow-emerald-500/40',
  },
  offline: {
    label: 'Offline',
    className: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500 shadow-red-500/40 animate-pulse',
  },
  degraded: {
    label: 'Degraded',
    className: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500 shadow-amber-500/40 animate-pulse',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500 shadow-blue-500/40',
  },
}

const typeIcons: Record<string, React.ElementType> = {
  server: Server,
  switch: ArrowUpDown,
  router: Wifi,
  firewall: Shield,
  ap: Signal,
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function MonitoringPage() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1500)
  }

  const onlineCount = mockDevices.filter((d) => d.status === 'online').length
  const offlineCount = mockDevices.filter((d) => d.status === 'offline').length
  const degradedCount = mockDevices.filter((d) => d.status === 'degraded').length
  const activeAlerts = mockAlerts.filter((a) => !a.acknowledged).length

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Monitoring
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time infrastructure health overview
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="rounded-xl h-10 gap-2 border-slate-200 dark:border-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {onlineCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Online</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{offlineCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Offline</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {degradedCount}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Degraded</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{activeAlerts}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active Alerts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Device List */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Devices</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {mockDevices.length} registered devices
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Activity className="h-3.5 w-3.5" />
                <span>Auto-refresh: 30s</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[600px] overflow-y-auto">
              {mockDevices.map((device) => {
                const status = statusConfig[device.status]
                const TypeIcon = typeIcons[device.type] || Server
                const cpuColor =
                  device.cpu > 80
                    ? 'bg-red-500'
                    : device.cpu > 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                const memColor =
                  device.memory > 80
                    ? 'bg-red-500'
                    : device.memory > 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'

                return (
                  <div
                    key={device.id}
                    className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status dot + Icon */}
                      <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                          <TypeIcon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${status.dotClass}`}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-white font-mono">
                            {device.name}
                          </span>
                          <span className={`text-[10px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                          <span>{device.ip}</span>
                          <span>&middot;</span>
                          <span>{device.location}</span>
                          <span>&middot;</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {device.lastCheck}
                          </span>
                        </div>
                      </div>

                      {/* Metrics */}
                      {device.status === 'online' || device.status === 'degraded' ? (
                        <div className="hidden sm:flex items-center gap-6">
                          <div className="w-20">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">CPU</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {device.cpu}%
                              </span>
                            </div>
                            <ProgressBar value={device.cpu} color={cpuColor} />
                          </div>
                          <div className="w-20">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">MEM</span>
                              <span className="font-semibold text-slate-600 dark:text-slate-300">
                                {device.memory}%
                              </span>
                            </div>
                            <ProgressBar value={device.memory} color={memColor} />
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Latency</p>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {device.latency}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Uptime</p>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {device.uptime}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="hidden sm:block text-sm text-slate-400 italic">
                          {device.status === 'maintenance' ? 'Under maintenance' : 'Unreachable'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="xl:col-span-1">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Alerts</h3>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-0">
                  {activeAlerts} active
                </Badge>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[540px] overflow-y-auto">
              {mockAlerts.map((alert) => {
                const severityStyles = {
                  critical: 'border-l-red-500 bg-red-50/50 dark:bg-red-500/5',
                  warning: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5',
                  info: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/5',
                }
                const severityBadge = {
                  critical: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
                  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
                }

                return (
                  <div
                    key={alert.id}
                    className={`p-4 border-l-[3px] ${severityStyles[alert.severity]} ${
                      alert.acknowledged ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold font-mono text-slate-800 dark:text-white">
                        {alert.device}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${severityBadge[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {alert.time}
                      </span>
                      {!alert.acknowledged && (
                        <button className="text-[10px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
