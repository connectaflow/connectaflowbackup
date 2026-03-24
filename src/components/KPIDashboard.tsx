"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, Database, Sparkles,
    CheckCircle2, RefreshCw, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { listAllProfiles, getSignalQueue, getHealth, type CompanyProfile, type SignalQueueItem, type HealthStatus } from '../services/api';
import { getErrorMessage } from '../lib/errors';
import { ui } from '../lib/ui';

interface KPI {
    label: string;
    value: string;
    sub: string;
    icon: typeof BarChart3;
    color: string;
    bg: string;
}

export const KPIDashboard = () => {
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState<HealthStatus | null>(null);
    const [signalBreakdown, setSignalBreakdown] = useState<Record<string, number>>({});

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [profilesResp, signalsResp, healthResp] = await Promise.all([
                listAllProfiles().catch(() => ({ profiles: [], total: 0 })),
                getSignalQueue(undefined, 200).catch(() => ({ data: { queue: [], total: 0 } })),
                getHealth().catch(() => ({ data: { status: 'unknown', providers: {} } })),
            ]);

            const profiles: CompanyProfile[] = profilesResp.profiles || [];
            const signals: SignalQueueItem[] = signalsResp.data.queue || [];
            const health = healthResp.data as HealthStatus;

            setSystemStatus(health);

            // Compute KPIs from real data
            const totalCompanies = profiles.length;
            const avgQuality = totalCompanies > 0
                ? profiles.reduce((acc, p) => acc + (p.quality_score || 0), 0) / totalCompanies
                : 0;
            const highQuality = profiles.filter(p => p.quality_tier === 'high').length;
            const withSignals = signals.length;

            // Signal type breakdown
            const breakdown: Record<string, number> = {};
            for (const item of signals) {
                for (const sig of (item.signals || [])) {
                    breakdown[sig.type] = (breakdown[sig.type] || 0) + 1;
                }
            }
            setSignalBreakdown(breakdown);

            setKpis([
                {
                    label: 'Companies Enriched',
                    value: totalCompanies.toString(),
                    sub: `${highQuality} high quality`,
                    icon: Database,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10',
                },
                {
                    label: 'Avg Quality Score',
                    value: `${(avgQuality * 100).toFixed(0)}%`,
                    sub: avgQuality >= 0.7 ? 'Excellent' : avgQuality >= 0.4 ? 'Good' : 'Needs work',
                    icon: CheckCircle2,
                    color: avgQuality >= 0.7 ? 'text-emerald-400' : 'text-amber-400',
                    bg: avgQuality >= 0.7 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
                },
                {
                    label: 'Active Signals',
                    value: withSignals.toString(),
                    sub: `${Object.keys(breakdown).length} signal types`,
                    icon: Sparkles,
                    color: 'text-brand-green',
                    bg: 'bg-brand-green/10',
                },
                {
                    label: 'Warm Leads',
                    value: signals.filter(s => s.composite_score >= 30).length.toString(),
                    sub: 'Score ≥ 30',
                    icon: TrendingUp,
                    color: 'text-rose-400',
                    bg: 'bg-rose-500/10',
                },
            ]);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to load dashboard'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const SIGNAL_LABELS: Record<string, string> = {
        hiring_sdr: 'Hiring SDR/BDR',
        hiring_ae: 'Hiring AE',
        hiring_vp_sales: 'VP Sales / CRO',
        hiring_ai_ml: 'AI/ML Engineers',
        hiring_engineering: 'Senior Engineers',
        hiring_marketing: 'Marketing Lead',
        enterprise_pricing: 'Enterprise Pricing',
        not_hiring: 'Not Hiring',
        early_stage: 'Early Stage',
    };

    return (
        <div className="h-full overflow-y-auto p-8" id="kpi-dashboard">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <BarChart3 className="w-5 h-5 text-text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary tracking-tight">Command Center</h1>
                            <p className="text-sm text-text-secondary">Real-time enrichment and signal analytics</p>
                        </div>
                    </div>
                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        className={ui.btnGhost}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {kpis.map((kpi, i) => (
                        <div key={i} className="bg-bg-card border border-border rounded-2xl p-5 hover:border-border transition-all">
                            <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center mb-4`}>
                                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                            </div>
                            <div className="text-2xl font-bold text-text-primary mb-1">{kpi.value}</div>
                            <div className="text-xs text-text-muted font-medium">{kpi.label}</div>
                            <div className={`text-[10px] font-semibold mt-1 ${kpi.color}`}>{kpi.sub}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Signal breakdown */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-text-primary mb-5 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-green" />
                            Signal Breakdown
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(signalBreakdown)
                                .sort((a, b) => b[1] - a[1])
                                .map(([type, count]) => {
                                    const maxCount = Math.max(...Object.values(signalBreakdown));
                                    return (
                                        <div key={type} className="flex items-center gap-3">
                                            <span className="text-xs text-text-secondary w-32 truncate">{SIGNAL_LABELS[type] || type}</span>
                                            <div className="flex-1 h-2 bg-bg-section rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-700"
                                                    style={{ width: `${(count / maxCount) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-text-muted font-mono w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            {Object.keys(signalBreakdown).length === 0 && (
                                <p className="text-xs text-text-muted text-center py-6">No signals detected yet</p>
                            )}
                        </div>
                    </div>

                    {/* System status */}
                    <div className="bg-bg-card border border-border rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-text-primary mb-5 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            System Status
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-text-secondary">API Status</span>
                                <span className={`text-xs font-bold ${systemStatus?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {systemStatus?.status === 'ok' ? '● Operational' : '● Down'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-border">
                                <span className="text-xs text-text-secondary">Groq Provider</span>
                                <span className={`text-xs font-bold ${systemStatus?.providers?.groq ? 'text-emerald-400' : 'text-text-muted'}`}>
                                    {systemStatus?.providers?.groq ? '● Connected' : '○ Not configured'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-border">
                                <span className="text-xs text-text-secondary">Gemini Provider</span>
                                <span className={`text-xs font-bold ${systemStatus?.providers?.gemini ? 'text-emerald-400' : 'text-text-muted'}`}>
                                    {systemStatus?.providers?.gemini ? '● Connected' : '○ Not configured'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-t border-border">
                                <span className="text-xs text-text-secondary">Version</span>
                                <span className="text-xs text-text-muted font-mono">{systemStatus?.version || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
