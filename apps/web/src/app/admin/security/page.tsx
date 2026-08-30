'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, Ban, CheckCircle2, RefreshCw,
  Activity, WifiOff, Zap, Lock, Unlock, Globe,
  TrendingUp, Server, Eye, Trash2, Plus, X,
  Clock, Filter, Download, BarChart3, MapPin,
  ShieldAlert, ShieldCheck, Settings, ChevronRight,
  Radio, Gauge, FileWarning, History, Layers,
  ArrowUp, ArrowDown, Minus, ToggleRight, ToggleLeft,
  Search, Copy, ExternalLink, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ThreatLevel = 'normal' | 'elevated' | 'critical';
type ProtectionMode = 'standard' | 'enhanced' | 'under-attack';
type TabId = 'overview' | 'traffic' | 'bans' | 'rate-limits' | 'waf' | 'geo' | 'whitelist' | 'incidents';

interface ThreatStatus {
  level: ThreatLevel;
  httpBansToday: number;
  wsBansToday: number;
  activeBans: number;
  isHttpAttackMode: boolean;
  isWsAttackMode: boolean;
  totalRequests24h: number;
  blockedRequests24h: number;
  avgResponseMs: number;
  uptime: number; // hours
  bandwidth: string;
  uniqueIPs: number;
}

interface BannedIp {
  ip: string;
  type: 'http' | 'ws';
  country: string;
  countryCode: string;
  details: { reason?: string; strikes?: number; bannedAt?: string; duration?: number; banLevel?: number; manual?: boolean };
  remainingSeconds: number;
}

interface Offender {
  ip: string;
  strikes: number;
  country: string;
  requests: number;
}

interface TrendPoint {
  date: string;
  httpBans: number;
  wsBans: number;
  requests: number;
  blocked: number;
}

interface RateLimit {
  id: string;
  endpoint: string;
  method: string;
  limit: number;
  window: string;
  current: number;
  enabled: boolean;
}

interface WafRule {
  id: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  triggered: number;
  lastTriggered?: string;
}

interface GeoBlock {
  country: string;
  code: string;
  blocked: boolean;
  requests24h: number;
  threats24h: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface Incident {
  id: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  sourceIps: number;
  duration: string;
  mitigated: boolean;
  details?: string;
}

interface TrafficPoint {
  time: string;
  legitimate: number;
  suspicious: number;
  blocked: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_STATUS: ThreatStatus = {
  level: 'elevated',
  httpBansToday: 34,
  wsBansToday: 8,
  activeBans: 6,
  isHttpAttackMode: true,
  isWsAttackMode: false,
  totalRequests24h: 2_847_392,
  blockedRequests24h: 12_847,
  avgResponseMs: 142,
  uptime: 743,
  bandwidth: '4.2 TB',
  uniqueIPs: 18_439,
};

const MOCK_BANS: BannedIp[] = [
  { ip: '185.220.101.45', type: 'http', country: 'Russia', countryCode: 'RU', details: { reason: 'burst_flood', strikes: 7, bannedAt: '2026-06-20T04:30:00Z', duration: 1800, banLevel: 2 }, remainingSeconds: 1420 },
  { ip: '94.102.63.11',   type: 'http', country: 'Netherlands', countryCode: 'NL', details: { reason: 'endpoint_limit:/api/v1/auth/login', strikes: 5, bannedAt: '2026-06-20T04:45:00Z', duration: 900, banLevel: 1 }, remainingSeconds: 640 },
  { ip: '45.155.205.32',  type: 'ws',   country: 'Germany', countryCode: 'DE', details: { reason: 'connection_storm', strikes: 3, bannedAt: '2026-06-20T04:50:00Z', duration: 600, banLevel: 1 }, remainingSeconds: 410 },
  { ip: '193.32.126.98',  type: 'http', country: 'Romania', countryCode: 'RO', details: { reason: 'suspicious_headers:score=5', strikes: 6, bannedAt: '2026-06-20T04:20:00Z', duration: 3600, banLevel: 3 }, remainingSeconds: 2800 },
  { ip: '178.32.53.61',   type: 'ws',   country: 'France', countryCode: 'FR', details: { reason: 'message_flood', strikes: 4, bannedAt: '2026-06-20T04:55:00Z', duration: 1800, banLevel: 2 }, remainingSeconds: 1620 },
  { ip: '10.10.10.10',    type: 'http', country: 'Internal', countryCode: '--', details: { reason: 'Manual ban — scraper', strikes: 0, bannedAt: '2026-06-20T03:00:00Z', duration: 86400, manual: true }, remainingSeconds: 76400 },
  { ip: '103.152.220.17', type: 'http', country: 'Indonesia', countryCode: 'ID', details: { reason: 'credential_stuffing', strikes: 9, bannedAt: '2026-06-20T03:15:00Z', duration: 7200, banLevel: 3 }, remainingSeconds: 4200 },
  { ip: '91.240.118.5',   type: 'http', country: 'Ukraine', countryCode: 'UA', details: { reason: 'api_abuse:/api/v1/search', strikes: 4, bannedAt: '2026-06-20T05:10:00Z', duration: 900, banLevel: 1 }, remainingSeconds: 320 },
];

const MOCK_OFFENDERS: Offender[] = [
  { ip: '62.210.102.33', strikes: 4, country: 'France', requests: 2841 },
  { ip: '88.99.23.167',  strikes: 3, country: 'Germany', requests: 1923 },
  { ip: '212.83.154.44', strikes: 3, country: 'France', requests: 1456 },
  { ip: '5.196.74.191',  strikes: 2, country: 'France', requests: 987 },
  { ip: '51.15.82.90',   strikes: 2, country: 'Netherlands', requests: 834 },
  { ip: '134.209.91.2',  strikes: 1, country: 'USA', requests: 612 },
];

const MOCK_TREND: TrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date('2026-06-20T00:00:00Z'); d.setDate(d.getDate() - (13 - i));
  const base = ((i * 17) % 30) + 10;
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    httpBans: base + ((i * 23) % 20),
    wsBans: (i * 11) % 15,
    requests: 200000 + ((i * 31) % 100000),
    blocked: 800 + ((i * 47) % 2000),
  };
});

const MOCK_TRAFFIC: TrafficPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  legitimate: 8000 + ((i * 101) % 4000),
  suspicious: 200 + ((i * 17) % 600),
  blocked: 50 + ((i * 7) % 300),
}));

const MOCK_RATE_LIMITS: RateLimit[] = [
  { id: 'rl-1', endpoint: '/api/v1/auth/login', method: 'POST', limit: 5, window: '15m', current: 3, enabled: true },
  { id: 'rl-2', endpoint: '/api/v1/auth/register', method: 'POST', limit: 3, window: '1h', current: 1, enabled: true },
  { id: 'rl-3', endpoint: '/api/v1/search', method: 'GET', limit: 60, window: '1m', current: 42, enabled: true },
  { id: 'rl-4', endpoint: '/api/v1/orders', method: 'POST', limit: 30, window: '1m', current: 12, enabled: true },
  { id: 'rl-5', endpoint: '/api/v1/payments/*', method: 'POST', limit: 10, window: '5m', current: 4, enabled: true },
  { id: 'rl-6', endpoint: '/api/v1/upload', method: 'POST', limit: 5, window: '10m', current: 0, enabled: true },
  { id: 'rl-7', endpoint: '/api/v1/otp/send', method: 'POST', limit: 3, window: '5m', current: 2, enabled: true },
  { id: 'rl-8', endpoint: '/graphql', method: 'POST', limit: 100, window: '1m', current: 67, enabled: true },
  { id: 'rl-9', endpoint: '/api/v1/reviews', method: 'POST', limit: 10, window: '1h', current: 3, enabled: false },
];

const MOCK_WAF_RULES: WafRule[] = [
  { id: 'waf-1', name: 'SQL Injection Protection', category: 'Injection', severity: 'critical', enabled: true, triggered: 287, lastTriggered: '3 min ago' },
  { id: 'waf-2', name: 'XSS Attack Prevention', category: 'Injection', severity: 'critical', enabled: true, triggered: 156, lastTriggered: '12 min ago' },
  { id: 'waf-3', name: 'Path Traversal Block', category: 'File Access', severity: 'high', enabled: true, triggered: 89, lastTriggered: '1h ago' },
  { id: 'waf-4', name: 'CSRF Token Validation', category: 'Session', severity: 'high', enabled: true, triggered: 43, lastTriggered: '45 min ago' },
  { id: 'waf-5', name: 'HTTP Request Smuggling', category: 'Protocol', severity: 'critical', enabled: true, triggered: 12, lastTriggered: '6h ago' },
  { id: 'waf-6', name: 'Malicious Bot Detection', category: 'Bot', severity: 'medium', enabled: true, triggered: 1847, lastTriggered: '1 min ago' },
  { id: 'waf-7', name: 'API Rate Abuse Detection', category: 'Abuse', severity: 'medium', enabled: true, triggered: 523, lastTriggered: '5 min ago' },
  { id: 'waf-8', name: 'Suspicious User-Agent Block', category: 'Bot', severity: 'low', enabled: false, triggered: 2341, lastTriggered: '30s ago' },
  { id: 'waf-9', name: 'File Upload Malware Scan', category: 'File Access', severity: 'high', enabled: true, triggered: 7, lastTriggered: '2 days ago' },
  { id: 'waf-10', name: 'SSRF Prevention', category: 'Injection', severity: 'critical', enabled: true, triggered: 34, lastTriggered: '2h ago' },
  { id: 'waf-11', name: 'Slowloris Detection', category: 'DDoS', severity: 'high', enabled: true, triggered: 98, lastTriggered: '20 min ago' },
  { id: 'waf-12', name: 'JSON Bomb Prevention', category: 'DDoS', severity: 'medium', enabled: true, triggered: 21, lastTriggered: '4h ago' },
];

const MOCK_GEO_BLOCKS: GeoBlock[] = [
  { country: 'Russia', code: 'RU', blocked: true, requests24h: 34502, threats24h: 1245, riskLevel: 'high' },
  { country: 'China', code: 'CN', blocked: true, requests24h: 28901, threats24h: 987, riskLevel: 'high' },
  { country: 'North Korea', code: 'KP', blocked: true, requests24h: 123, threats24h: 118, riskLevel: 'high' },
  { country: 'Iran', code: 'IR', blocked: true, requests24h: 4501, threats24h: 312, riskLevel: 'high' },
  { country: 'United States', code: 'US', blocked: false, requests24h: 892301, threats24h: 156, riskLevel: 'low' },
  { country: 'India', code: 'IN', blocked: false, requests24h: 645200, threats24h: 89, riskLevel: 'low' },
  { country: 'United Kingdom', code: 'GB', blocked: false, requests24h: 234100, threats24h: 34, riskLevel: 'low' },
  { country: 'Germany', code: 'DE', blocked: false, requests24h: 98400, threats24h: 234, riskLevel: 'medium' },
  { country: 'France', code: 'FR', blocked: false, requests24h: 87200, threats24h: 312, riskLevel: 'medium' },
  { country: 'Netherlands', code: 'NL', blocked: false, requests24h: 45200, threats24h: 445, riskLevel: 'medium' },
  { country: 'Romania', code: 'RO', blocked: false, requests24h: 12300, threats24h: 534, riskLevel: 'high' },
  { country: 'Ukraine', code: 'UA', blocked: false, requests24h: 8700, threats24h: 423, riskLevel: 'high' },
  { country: 'Indonesia', code: 'ID', blocked: false, requests24h: 34500, threats24h: 234, riskLevel: 'medium' },
  { country: 'Brazil', code: 'BR', blocked: false, requests24h: 56700, threats24h: 67, riskLevel: 'low' },
  { country: 'Qatar', code: 'QA', blocked: false, requests24h: 432100, threats24h: 12, riskLevel: 'low' },
  { country: 'UAE', code: 'AE', blocked: false, requests24h: 387600, threats24h: 23, riskLevel: 'low' },
  { country: 'Saudi Arabia', code: 'SA', blocked: false, requests24h: 298400, threats24h: 45, riskLevel: 'low' },
];

const MOCK_INCIDENTS: Incident[] = [
  { id: 'inc-1', timestamp: '2026-06-20 05:12:00', type: 'HTTP Flood', severity: 'critical', description: 'Volumetric HTTP flood from 23 IPs targeting /api/v1/auth/login — 45,000 req/s peak', sourceIps: 23, duration: '8 min', mitigated: true, details: 'Attack auto-mitigated by rate limiter + attack-mode escalation. All source IPs banned at Level 3.' },
  { id: 'inc-2', timestamp: '2026-06-20 03:45:00', type: 'Credential Stuffing', severity: 'critical', description: 'Automated credential stuffing attack using 12,000 leaked email/password pairs', sourceIps: 8, duration: '22 min', mitigated: true, details: 'Detected by login anomaly pattern. IPs banned, affected accounts locked, security team notified.' },
  { id: 'inc-3', timestamp: '2026-06-20 01:30:00', type: 'WebSocket Storm', severity: 'warning', description: 'WebSocket connection storm — 800 simultaneous connections from single subnet', sourceIps: 1, duration: '3 min', mitigated: true },
  { id: 'inc-4', timestamp: '2026-06-19 22:15:00', type: 'API Scraping', severity: 'warning', description: 'Aggressive product catalog scraping — 50,000 requests in 10 minutes from rotating proxies', sourceIps: 45, duration: '10 min', mitigated: true },
  { id: 'inc-5', timestamp: '2026-06-19 18:00:00', type: 'Suspicious Headers', severity: 'info', description: 'Cluster of requests with malformed User-Agent strings flagged by WAF', sourceIps: 3, duration: '1 min', mitigated: true },
  { id: 'inc-6', timestamp: '2026-06-19 14:30:00', type: 'SQL Injection Attempt', severity: 'critical', description: 'Multiple SQLi payloads detected in search query parameters', sourceIps: 2, duration: '5 min', mitigated: true },
  { id: 'inc-7', timestamp: '2026-06-19 10:45:00', type: 'Slowloris Attack', severity: 'warning', description: 'Slow HTTP connections holding server threads open', sourceIps: 15, duration: '12 min', mitigated: true },
  { id: 'inc-8', timestamp: '2026-06-18 20:00:00', type: 'DNS Amplification', severity: 'critical', description: 'DNS amplification attack generating 2.5 Gbps peak traffic', sourceIps: 120, duration: '35 min', mitigated: true },
];

const MOCK_WHITELIST = ['10.0.0.1', '192.168.1.1', '172.16.0.0/16', '10.10.0.5', '35.190.247.0/24'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(s: number): string {
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60)   return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function threatConfig(level: ThreatLevel) {
  if (level === 'critical') return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50 border-red-200', glow: 'shadow-red-500/20', label: 'CRITICAL', icon: <AlertTriangle className="w-5 h-5" /> };
  if (level === 'elevated') return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50 border-amber-200', glow: 'shadow-amber-500/20', label: 'ELEVATED', icon: <AlertTriangle className="w-5 h-5" /> };
  return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50 border-emerald-200', glow: 'shadow-emerald-500/20', label: 'NORMAL', icon: <CheckCircle2 className="w-5 h-5" /> };
}

const sevConfig = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const riskConfig = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'traffic', label: 'Live Traffic', icon: <Radio className="w-3.5 h-3.5" /> },
  { id: 'bans', label: 'Active Bans', icon: <Ban className="w-3.5 h-3.5" /> },
  { id: 'rate-limits', label: 'Rate Limits', icon: <Gauge className="w-3.5 h-3.5" /> },
  { id: 'waf', label: 'WAF Rules', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { id: 'geo', label: 'Geo-Blocking', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'whitelist', label: 'Whitelist', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'incidents', label: 'Incidents', icon: <History className="w-3.5 h-3.5" /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SecurityDashboardPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [status, setStatus]         = useState<ThreatStatus>(MOCK_STATUS);
  const [bans, setBans]             = useState<BannedIp[]>(MOCK_BANS);
  const [offenders, setOffenders]   = useState<Offender[]>(MOCK_OFFENDERS);
  const [trend]                     = useState<TrendPoint[]>(MOCK_TREND);
  const [traffic]                   = useState<TrafficPoint[]>(MOCK_TRAFFIC);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>(MOCK_RATE_LIMITS);
  const [wafRules, setWafRules]     = useState<WafRule[]>(MOCK_WAF_RULES);
  const [geoBlocks, setGeoBlocks]   = useState<GeoBlock[]>(MOCK_GEO_BLOCKS);
  const [incidents]                 = useState<Incident[]>(MOCK_INCIDENTS);
  const [whitelist, setWhitelist]   = useState<string[]>(MOCK_WHITELIST);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [protectionMode, setProtectionMode] = useState<ProtectionMode>('enhanced');
  const [banIpInput, setBanIpInput] = useState('');
  const [banReason, setBanReason]   = useState('');
  const [banDuration, setBanDuration] = useState('86400');
  const [wlInput, setWlInput]       = useState('');
  const [activeTab, setActiveTab]   = useState<TabId>('overview');
  const [geoSearch, setGeoSearch]   = useState('');
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setStatus(s => ({ ...s, httpBansToday: s.httpBansToday + Math.floor(Math.random() * 2), totalRequests24h: s.totalRequests24h + Math.floor(Math.random() * 500), blockedRequests24h: s.blockedRequests24h + Math.floor(Math.random() * 10), avgResponseMs: 130 + Math.floor(Math.random() * 40) }));
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const tc = threatConfig(status.level);
  const trendMax = Math.max(...trend.map(t => t.httpBans + t.wsBans), 1);
  const trafficMax = Math.max(...traffic.map(t => t.legitimate + t.suspicious + t.blocked), 1);
  const blockRate = ((status.blockedRequests24h / status.totalRequests24h) * 100).toFixed(2);

  const handleManualBan = () => {
    if (!banIpInput.trim() || !banReason.trim()) return;
    setBans(prev => [...prev, { ip: banIpInput.trim(), type: 'http', country: 'Unknown', countryCode: '??', details: { reason: banReason, manual: true, bannedAt: new Date().toISOString(), duration: Number(banDuration) }, remainingSeconds: Number(banDuration) }]);
    setBanIpInput(''); setBanReason('');
  };
  const handleUnban = (ip: string) => setBans(prev => prev.filter(b => b.ip !== ip));
  const handleAddWhitelist = () => { if (!wlInput.trim()) return; setWhitelist(prev => [...new Set([...prev, wlInput.trim()])]); setWlInput(''); };
  const handleRemoveWhitelist = (ip: string) => setWhitelist(prev => prev.filter(w => w !== ip));

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" />
            DDoS &amp; Security Center
          </h1>
          <p className="text-slate-500 text-sm">Real-time threat monitoring, WAF management, rate limiting &amp; attack mitigation</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400" suppressHydrationWarning>Refreshed {lastRefresh.toLocaleTimeString()}</span>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${autoRefresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
          >
            <Activity className="w-3 h-3" />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={refresh} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-700">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Threat Banner + Protection Mode ──────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${tc.light} shadow-lg ${tc.glow}`}>
        <div className="flex items-center gap-4 px-6 py-5">
          <div className={`w-14 h-14 rounded-2xl ${tc.bg} text-white flex items-center justify-center shadow-lg`}>
            {tc.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className={`font-black text-xl ${tc.text}`}>Threat Level: {tc.label}</p>
              {status.level !== 'normal' && <span className="relative flex h-3 w-3"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tc.bg} opacity-75`} /><span className={`relative inline-flex rounded-full h-3 w-3 ${tc.bg}`} /></span>}
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              {status.isHttpAttackMode && <span className="text-red-600 font-bold">⚡ HTTP Attack Mode · </span>}
              {status.isWsAttackMode && <span className="text-orange-600 font-bold">🔌 WS Attack Mode · </span>}
              <span className="text-slate-500">{status.httpBansToday + status.wsBansToday} bans today · {status.activeBans} active · {formatNum(status.blockedRequests24h)} blocked (24h)</span>
            </p>
          </div>

          {/* Protection Mode Selector */}
          <div className="hidden md:flex items-center gap-1 bg-white/80 border border-slate-200/50 rounded-xl p-1">
            {(['standard', 'enhanced', 'under-attack'] as ProtectionMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setProtectionMode(mode);
                  if (mode === 'under-attack') setStatus(s => ({ ...s, level: 'critical', isHttpAttackMode: true, isWsAttackMode: true }));
                  else if (mode === 'enhanced') setStatus(s => ({ ...s, level: 'elevated', isHttpAttackMode: true, isWsAttackMode: false }));
                  else setStatus(s => ({ ...s, level: 'normal', isHttpAttackMode: false, isWsAttackMode: false }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${protectionMode === mode
                  ? mode === 'under-attack' ? 'bg-red-600 text-white shadow' : mode === 'enhanced' ? 'bg-amber-500 text-white shadow' : 'bg-emerald-600 text-white shadow'
                  : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label={`Set protection to ${mode} mode`}
              >
                {mode === 'standard' ? '🟢 Standard' : mode === 'enhanced' ? '🟡 Enhanced' : '🔴 Under Attack'}
              </button>
            ))}
          </div>
        </div>

        {/* Uptime bar */}
        <div className="px-6 py-2 bg-black/5 border-t border-black/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime: <strong>{Math.floor(status.uptime / 24)}d {status.uptime % 24}h</strong></span>
            <span className="text-slate-600 flex items-center gap-1"><Server className="w-3 h-3" /> Bandwidth: <strong>{status.bandwidth}</strong></span>
            <span className="text-slate-600 flex items-center gap-1"><Globe className="w-3 h-3" /> Unique IPs: <strong>{formatNum(status.uniqueIPs)}</strong></span>
          </div>
          <span className="text-slate-500">Avg Response: <strong className={status.avgResponseMs > 200 ? 'text-red-600' : status.avgResponseMs > 150 ? 'text-amber-600' : 'text-emerald-600'}>{status.avgResponseMs}ms</strong></span>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: <TrendingUp className="w-4 h-4 text-blue-600" />, label: 'Requests (24h)', value: formatNum(status.totalRequests24h), color: 'bg-blue-50 border-blue-200', change: '+12%', up: true },
          { icon: <Ban className="w-4 h-4 text-rose-600" />, label: 'Blocked (24h)', value: formatNum(status.blockedRequests24h), color: 'bg-rose-50 border-rose-200', change: blockRate + '%', up: true },
          { icon: <Lock className="w-4 h-4 text-slate-600" />, label: 'Active Bans', value: String(bans.length), color: 'bg-slate-50 border-slate-200', change: String(status.httpBansToday + status.wsBansToday) + ' today' },
          { icon: <ShieldAlert className="w-4 h-4 text-purple-600" />, label: 'WAF Blocked', value: formatNum(MOCK_WAF_RULES.reduce((s, r) => s + r.triggered, 0)), color: 'bg-purple-50 border-purple-200', change: MOCK_WAF_RULES.filter(r => r.enabled).length + ' rules' },
          { icon: <Globe className="w-4 h-4 text-amber-600" />, label: 'Geo-Blocked', value: String(geoBlocks.filter(g => g.blocked).length), color: 'bg-amber-50 border-amber-200', change: 'countries' },
          { icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />, label: 'Whitelist', value: String(whitelist.length), color: 'bg-emerald-50 border-emerald-200', change: 'trusted IPs' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 shadow-sm ${s.color}`}>
            <div className="flex items-center justify-between mb-2">{s.icon}<span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">{s.up !== undefined ? (s.up ? <ArrowUp className="w-2.5 h-2.5 text-rose-500" /> : <ArrowDown className="w-2.5 h-2.5 text-emerald-500" />) : <Minus className="w-2.5 h-2.5" />}{s.change}</span></div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 flex gap-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`ddos-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.icon} {tab.label}
            {tab.id === 'bans' && bans.length > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">{bans.length}</span>}
            {tab.id === 'incidents' && <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-0.5">{incidents.length}</span>}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────── TAB: OVERVIEW ──────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Offenders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Eye className="w-4 h-4 text-amber-500" /> Top Strike Offenders</h2>
              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{offenders.length} watching</span>
            </div>
            <div className="divide-y divide-slate-50">
              {offenders.map((o, i) => (
                <div key={o.ip} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <span className={`text-xs font-black w-5 h-5 rounded flex items-center justify-center ${i < 2 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm text-slate-900 font-bold">{o.ip}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{o.country} · {formatNum(o.requests)} req</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden w-16">
                      <div ref={el => { if (el) el.style.setProperty('--usage-w', `${(o.strikes / 5) * 100}%`); }} className={`h-full rounded-full transition-all security-usage-bar ${o.strikes >= 4 ? 'bg-red-500' : 'bg-amber-500'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 w-12">{o.strikes}/5</span>
                  </div>
                  <button
                    onClick={() => { setBans(prev => [...prev, { ip: o.ip, type: 'http', country: o.country, countryCode: '??', details: { reason: 'preemptive_ban', strikes: o.strikes }, remainingSeconds: 900 }]); setOffenders(prev => prev.filter(x => x.ip !== o.ip)); }}
                    className="text-[10px] px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold hover:bg-rose-100 transition-colors"
                  >
                    Ban
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions + Manual Ban */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><Ban className="w-4 h-4 text-rose-500" /> Manual IP Ban</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input id="manual-ban-ip" placeholder="IP Address" value={banIpInput} onChange={e => setBanIpInput(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900" />
                  <input id="manual-ban-reason" placeholder="Reason" value={banReason} onChange={e => setBanReason(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualBan()} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
                </div>
                <div className="flex gap-3">
                  <select value={banDuration} onChange={e => setBanDuration(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none" aria-label="Ban duration">
                    <option value="900">15 min</option><option value="3600">1 hour</option><option value="86400">24 hours</option><option value="604800">7 days</option><option value="2592000">30 days</option>
                  </select>
                  <button id="manual-ban-submit" onClick={handleManualBan} disabled={!banIpInput.trim() || !banReason.trim()} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" /> Ban IP
                  </button>
                </div>
              </div>
            </div>

            {/* Protection Layers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 mb-3"><Layers className="w-4 h-4 text-blue-500" /> Active Protection Layers</h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['IP Ban list', true], ['Trusted proxy validation', true],
                  ['Endpoint rate limits', true], ['Burst detection (5s)', true],
                  ['Attack-mode tightening', status.isHttpAttackMode || status.isWsAttackMode],
                  ['WS connection validation', true], ['WS event flood detection', true],
                  ['Slowloris protection', true], ['CSRF token validation', true],
                  ['WAF rules engine', true], ['Geo-blocking', geoBlocks.some(g => g.blocked)],
                  ['Bot detection', true],
                ].map(([label, active]) => (
                  <div key={label as string} className="flex items-center gap-2 text-xs py-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={active ? 'text-slate-700 font-medium' : 'text-slate-400'}>{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 14-Day Trend — spans full width */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" /> 14-Day Ban Trend</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-rose-400 rounded" /> HTTP</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-amber-400 rounded" /> WS</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {trend.map(t => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                  <div className="relative flex flex-col justify-end gap-0.5 h-20 w-full">
                    <div ref={el => { if (el) { el.style.setProperty('--bar-h', `${trendMax > 0 ? (t.httpBans / trendMax) * 60 : 0}px`); el.style.minHeight = t.httpBans > 0 ? '2px' : '0'; }}} className="bg-rose-400 rounded-t-sm transition-all group-hover:bg-rose-500 security-bar" />
                    <div ref={el => { if (el) { el.style.setProperty('--bar-h', `${trendMax > 0 ? (t.wsBans / trendMax) * 20 : 0}px`); el.style.minHeight = t.wsBans > 0 ? '2px' : '0'; }}} className="bg-amber-400 rounded-t-sm transition-all group-hover:bg-amber-500 security-bar" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {t.httpBans + t.wsBans} bans
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400">{t.date.split(' ')[1]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-lg font-black text-slate-900">{trend.reduce((s, t) => s + t.httpBans, 0)}</p><p className="text-[10px] text-slate-500">HTTP Bans (14d)</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-lg font-black text-slate-900">{trend.reduce((s, t) => s + t.wsBans, 0)}</p><p className="text-[10px] text-slate-500">WS Bans (14d)</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-lg font-black text-slate-900">{Math.max(...trend.map(t => t.httpBans))}</p><p className="text-[10px] text-slate-500">Peak HTTP/day</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-lg font-black text-slate-900">{formatNum(trend.reduce((s, t) => s + t.blocked, 0))}</p><p className="text-[10px] text-slate-500">Total Blocked (14d)</p></div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: LIVE TRAFFIC ──────────── */}
      {activeTab === 'traffic' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Radio className="w-4 h-4 text-blue-500" /> 24-Hour Traffic Pattern</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-emerald-400 rounded" /> Legitimate</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-amber-400 rounded" /> Suspicious</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-rose-400 rounded" /> Blocked</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-36">
              {traffic.map(t => {
                const total = t.legitimate + t.suspicious + t.blocked;
                return (
                  <div key={t.time} className="flex-1 flex flex-col justify-end h-full group cursor-pointer relative">
                    <div ref={el => { if (el) el.style.setProperty('--bar-h', `${(t.legitimate / trafficMax) * 100}%`); }} className="bg-emerald-400/80 transition-all group-hover:bg-emerald-500 security-bar" />
                    <div ref={el => { if (el) el.style.setProperty('--bar-h', `${(t.suspicious / trafficMax) * 100}%`); }} className="bg-amber-400/80 transition-all group-hover:bg-amber-500 security-bar" />
                    <div ref={el => { if (el) el.style.setProperty('--bar-h', `${(t.blocked / trafficMax) * 100}%`); }} className="bg-rose-400/80 transition-all group-hover:bg-rose-500 security-bar" />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {formatNum(total)} req
                    </div>
                    <span className="text-[8px] text-slate-400 text-center mt-1">{t.time.split(':')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-emerald-700">{formatNum(traffic.reduce((s, t) => s + t.legitimate, 0))}</p><p className="text-xs text-emerald-600">Legitimate</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-amber-700">{formatNum(traffic.reduce((s, t) => s + t.suspicious, 0))}</p><p className="text-xs text-amber-600">Suspicious</p></div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-rose-700">{formatNum(traffic.reduce((s, t) => s + t.blocked, 0))}</p><p className="text-xs text-rose-600">Blocked</p></div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-blue-700">{Math.max(...traffic.map(t => t.legitimate + t.suspicious + t.blocked)).toLocaleString()}</p><p className="text-xs text-blue-600">Peak Hour</p></div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: ACTIVE BANS ──────────── */}
      {activeTab === 'bans' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm font-bold text-slate-700">{bans.length} active bans</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">{bans.filter(b => b.type === 'http').length} HTTP</span>
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-bold">{bans.filter(b => b.type === 'ws').length} WS</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">{bans.filter(b => b.details.manual).length} Manual</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-center">Strikes</th>
                  <th className="px-4 py-3 text-center">Level</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bans.map(ban => (
                  <tr key={`${ban.type}-${ban.ip}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900 text-xs">{ban.ip}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{ban.country}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ban.type === 'http' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{ban.type.toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate text-xs">{ban.details.reason || '—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600 text-xs">{ban.details.strikes ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {ban.details.manual ? <span className="text-[10px] font-bold text-slate-500">Manual</span> : <span className={`text-[10px] font-bold ${(ban.details.banLevel ?? 1) >= 3 ? 'text-red-600' : 'text-amber-600'}`}>Lv.{ban.details.banLevel ?? 1}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{formatSeconds(ban.remainingSeconds)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleUnban(ban.ip)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors" title="Unban">
                        <Unlock className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {bans.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No active bans 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: RATE LIMITS ──────────── */}
      {activeTab === 'rate-limits' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><Gauge className="w-4 h-4 text-blue-500" /> Endpoint Rate Limits</h2>
            <span className="text-xs text-slate-400">{rateLimits.filter(r => r.enabled).length} active rules</span>
          </div>
          <div className="divide-y divide-slate-100">
            {rateLimits.map(rl => {
              const usage = rl.limit > 0 ? (rl.current / rl.limit) * 100 : 0;
              return (
                <div key={rl.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${rl.enabled ? 'hover:bg-slate-50/50' : 'opacity-50'}`}>
                  <button onClick={() => setRateLimits(prev => prev.map(r => r.id === rl.id ? { ...r, enabled: !r.enabled } : r))} className="shrink-0">
                    {rl.enabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rl.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{rl.method}</span>
                      <code className="text-sm font-mono text-slate-900 font-bold truncate">{rl.endpoint}</code>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{rl.limit} requests per {rl.window}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-500">{rl.current}/{rl.limit}</span>
                      <span className={`font-bold ${usage > 80 ? 'text-red-600' : usage > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{Math.round(usage)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div ref={el => { if (el) el.style.setProperty('--usage-w', `${usage}%`); }} className={`h-full rounded-full transition-all security-usage-bar ${usage > 80 ? 'bg-red-500' : usage > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: WAF RULES ────────────── */}
      {activeTab === 'waf' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xl font-black text-slate-900">{wafRules.length}</p><p className="text-xs text-slate-500">Total Rules</p></div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><p className="text-xl font-black text-emerald-700">{wafRules.filter(r => r.enabled).length}</p><p className="text-xs text-emerald-600">Active</p></div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4"><p className="text-xl font-black text-rose-700">{formatNum(wafRules.reduce((s, r) => s + r.triggered, 0))}</p><p className="text-xs text-rose-600">Total Triggered</p></div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4"><p className="text-xl font-black text-purple-700">{wafRules.filter(r => r.severity === 'critical').length}</p><p className="text-xs text-purple-600">Critical Rules</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {wafRules.map(rule => {
                const sc = sevConfig[rule.severity];
                return (
                  <div key={rule.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${rule.enabled ? 'hover:bg-slate-50/50' : 'opacity-50'}`}>
                    <button onClick={() => setWafRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))} className="shrink-0">
                      {rule.enabled ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{rule.category}</span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${sc.bg} ${sc.text}`}><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{rule.severity}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">{formatNum(rule.triggered)}</p>
                      <p className="text-[10px] text-slate-400">{rule.lastTriggered || 'Never'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: GEO-BLOCKING ─────────── */}
      {activeTab === 'geo' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={geoSearch} onChange={e => setGeoSearch(e.target.value)} placeholder="Search countries..." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900" />
            </div>
            <span className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg font-bold border border-rose-200">{geoBlocks.filter(g => g.blocked).length} countries blocked</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3">Country</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Requests (24h)</th>
                    <th className="px-4 py-3 text-right">Threats (24h)</th>
                    <th className="px-4 py-3 text-center">Risk</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {geoBlocks.filter(g => !geoSearch || g.country.toLowerCase().includes(geoSearch.toLowerCase())).map(geo => {
                    const rc = riskConfig[geo.riskLevel];
                    return (
                      <tr key={geo.code} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3"><span className="font-bold text-slate-900">{geo.country}</span> <span className="text-slate-400 text-xs">({geo.code})</span></td>
                        <td className="px-4 py-3 text-center">
                          {geo.blocked ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">BLOCKED</span> : <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">ALLOWED</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 font-mono text-xs">{formatNum(geo.requests24h)}</td>
                        <td className="px-4 py-3 text-right font-bold text-xs text-rose-600">{formatNum(geo.threats24h)}</td>
                        <td className="px-4 py-3 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rc.bg} ${rc.text}`}>{geo.riskLevel}</span></td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setGeoBlocks(prev => prev.map(g => g.code === geo.code ? { ...g, blocked: !g.blocked } : g))}
                            className={`p-1.5 rounded-lg transition-colors ${geo.blocked ? 'hover:bg-emerald-50 text-emerald-600' : 'hover:bg-red-50 text-red-500'}`}
                            title={geo.blocked ? 'Unblock' : 'Block'}
                          >
                            {geo.blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: WHITELIST ─────────────── */}
      {activeTab === 'whitelist' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> IP Whitelist</h2>
            <p className="text-xs text-slate-400 mt-0.5">Whitelisted IPs bypass all DDoS checks, WAF rules, and rate limits.</p>
          </div>
          <div className="p-5 flex gap-3">
            <input id="whitelist-ip-input" placeholder="IP or CIDR (e.g. 10.0.0.5 or 10.0.0.0/24)" value={wlInput} onChange={e => setWlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddWhitelist()} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button id="whitelist-add-btn" onClick={handleAddWhitelist} disabled={!wlInput.trim()} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {whitelist.map(ip => (
              <div key={ip} className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <code className="font-mono text-sm text-slate-900 flex-1 font-bold">{ip}</code>
                <span className="text-[10px] text-emerald-600 font-bold">Bypasses all checks</span>
                <button onClick={() => handleRemoveWhitelist(ip)} className="p-1 hover:bg-emerald-100 rounded text-emerald-700" title={`Remove ${ip} from whitelist`} aria-label={`Remove ${ip}`}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────── TAB: INCIDENTS ─────────────── */}
      {activeTab === 'incidents' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-red-700">{incidents.filter(i => i.severity === 'critical').length}</p><p className="text-xs text-red-600">Critical</p></div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-amber-700">{incidents.filter(i => i.severity === 'warning').length}</p><p className="text-xs text-amber-600">Warning</p></div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"><p className="text-xl font-black text-blue-700">{incidents.filter(i => i.severity === 'info').length}</p><p className="text-xs text-blue-600">Info</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {incidents.map(inc => {
                const sc = sevConfig[inc.severity];
                return (
                  <div key={inc.id} className="hover:bg-slate-50/30 transition-colors">
                    <button onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)} className="w-full text-left px-5 py-4 flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{inc.type}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>{inc.severity.toUpperCase()}</span>
                          {inc.mitigated && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">MITIGATED</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{inc.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">{inc.timestamp}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inc.sourceIps} IPs · {inc.duration}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${expandedIncident === inc.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedIncident === inc.id && inc.details && (
                      <div className="px-5 pb-4 ml-7">
                        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200">{inc.details}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
