import { MetricCard } from '@tetherto/mdk-react-devkit/foundation'
import { Button, LineChart, Spinner, Typography } from '@tetherto/mdk-react-devkit/core'
import { useAuth, useQuery, useMdkContext } from '@tetherto/mdk-react-adapter'
import type { CSSProperties, JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const AUTH_TOKEN_KEY = 'mdk_auth_token'
const MAX_HISTORY = 60
// Set by start.js via VITE_NO_AUTH=true when app-node runs without authentication
const NO_AUTH = import.meta.env.VITE_NO_AUTH === 'true'

type DeviceStats = {
  deviceId: string
  workerId: string
  hashrateMhs: number
  powerW: number
}

type SiteHashrateResponse = {
  totalHashrateMhs: number
  totalPowerW: number
  deviceCount: number
  devices: DeviceStats[]
  ts: number
  error?: string
}

// Core LineChart datapoint: x is a ms epoch timestamp (the chart converts it to
// seconds internally), y the plotted value.
type HashratePoint = { x: number; y: number }

// ── Google icon SVG ────────────────────────────────────────────────────────────
const GoogleIcon = (): JSX.Element => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
)

export function SiteHashratePage(): JSX.Element {
  const { apiBaseUrl } = useMdkContext()
  const { token, setToken } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)
  const [history, setHistory] = useState<HashratePoint[]>([])
  const lastTs = useRef<number>(0)

  // Handle OAuth callback — token arrives as ?authToken= in the redirect URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const callbackToken = params.get('authToken')
    const callbackError = params.get('error')

    if (callbackError) {
      setAuthError(decodeURIComponent(callbackError))
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    if (callbackToken) {
      setToken(callbackToken)
      localStorage.setItem(AUTH_TOKEN_KEY, callbackToken)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const saved = localStorage.getItem(AUTH_TOKEN_KEY)
    if (saved) setToken(saved)
  }, [setToken])

  const handleLogout = (): void => {
    setToken(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setHistory([])
    lastTs.current = 0
  }

  const { data, isFetching } = useQuery<SiteHashrateResponse>({
    queryKey: ['site-hashrate'],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${apiBaseUrl}/site-monitor/hashrate`, { headers })
      if (res.status === 401) {
        setToken(null)
        localStorage.removeItem(AUTH_TOKEN_KEY)
        throw new Error('ERR_UNAUTHORIZED')
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<SiteHashrateResponse>
    },
    enabled: NO_AUTH || !!token,
    refetchInterval: 5_000,
    retry: false,
  })

  const tick = useCallback((snapshot: SiteHashrateResponse) => {
    const second = Math.round(snapshot.ts / 1000)
    if (second <= lastTs.current) return
    lastTs.current = second
    const point: HashratePoint = { x: snapshot.ts, y: snapshot.totalHashrateMhs / 1e6 } // MH/s → TH/s
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), point])
  }, [])

  useEffect(() => {
    if (data && !data.error) tick(data)
  }, [data, tick])

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!token && !NO_AUTH) {
    return (
      <div style={styles.page}>
        <div style={styles.loginBox}>
          <Typography variant="heading1" align="center">
            MDK Site Monitor
          </Typography>
          <Typography variant="body" color="muted" align="center">
            A live hashrate dashboard for your mining site.
          </Typography>

          {authError && (
            <Typography variant="caption" style={{ color: '#f87171' }} align="center">
              {authError}
            </Typography>
          )}

          <Button
            variant="primary"
            icon={<GoogleIcon />}
            iconPosition="left"
            onClick={() => { window.location.href = `${apiBaseUrl}/oauth/google` }}
            style={{ marginTop: '0.5rem' }}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  const totalHashrateThs = data ? (data.totalHashrateMhs / 1e6).toFixed(2) : '—'
  const totalPowerW = data ? data.totalPowerW : 0
  const deviceCount = data ? data.deviceCount : 0

  return (
    <div style={styles.page}>
      <div style={styles.dashboard}>

        {/* Header */}
        <div style={styles.header}>
          <Typography variant="heading2">Site Hashrate</Typography>
          {!NO_AUTH && (
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          )}
        </div>

        {/* Metric cards */}
        <div style={styles.metrics}>
          <MetricCard
            label="Total Hashrate"
            unit="TH/s"
            value={totalHashrateThs}
            isHighlighted
          />
          <MetricCard
            label="Total Power"
            unit="W"
            value={totalPowerW.toLocaleString()}
          />
          <MetricCard
            label="Active Devices"
            unit=""
            value={deviceCount}
          />
        </div>

        {/* Hashrate chart */}
        <div style={styles.chartWrap}>
          {history.length === 0 && isFetching ? (
            <div style={styles.chartLoading}>
              <Spinner size="md" type="circle" />
              <Typography variant="body" color="muted">
                Waiting for first data point…
              </Typography>
            </div>
          ) : (
            <LineChart
              data={{ datasets: [{ label: 'Hashrate', borderColor: '#f7931a', data: history }] }}
              fixedTimezone="UTC"
              height={340}
              yTicksFormatter={(v: number) => `${v.toFixed(2)} TH/s`}
            />
          )}
        </div>

        {/* Per-device breakdown */}
        {data && !data.error && data.devices.length > 0 && (
          <div style={styles.deviceTable}>
            <Typography variant="heading3" style={{ marginBottom: '0.75rem' }}>
              Devices
            </Typography>
            <div style={styles.deviceHeader}>
              <Typography variant="caption" color="muted" style={styles.colId}>Device ID</Typography>
              <Typography variant="caption" color="muted" style={styles.colVal}>Hashrate</Typography>
              <Typography variant="caption" color="muted" style={styles.colVal}>Power</Typography>
            </div>
            {data.devices.map(d => (
              <div key={d.deviceId} style={styles.deviceRow}>
                <Typography variant="caption" style={{ ...styles.colId, fontFamily: 'monospace' }}>
                  {d.deviceId}
                </Typography>
                <Typography variant="caption" style={styles.colVal}>
                  {(d.hashrateMhs / 1e6).toFixed(2)} TH/s
                </Typography>
                <Typography variant="caption" style={styles.colVal}>
                  {d.powerW.toLocaleString()} W
                </Typography>
              </div>
            ))}
          </div>
        )}

        {/* No data yet */}
        {!data && !isFetching && (
          <Typography variant="body" color="muted" align="center">
            No data — is app-node running and connected to ORK?
          </Typography>
        )}
      </div>
    </div>
  )
}

// ── Minimal layout styles (no external CSS file) ──────────────────────────────
const styles = {
  page:         { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' },
  loginBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', marginTop: '20vh', maxWidth: '360px', width: '100%' },
  dashboard:    { width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  metrics:      { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  chartWrap:    { borderRadius: '8px', overflow: 'hidden' },
  chartLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '340px', opacity: 0.6 },
  deviceTable:  { display: 'flex', flexDirection: 'column' },
  deviceHeader: { display: 'flex', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '0.25rem' },
  deviceRow:    { display: 'flex', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  colId:        { flex: '1 1 auto', minWidth: 0 },
  colVal:       { width: '140px', flexShrink: 0 },
} satisfies Record<string, CSSProperties>
