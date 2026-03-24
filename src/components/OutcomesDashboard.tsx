import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Mail, Linkedin, Phone, RefreshCw, Upload, Download,
  TrendingUp, Users, MessageSquare, Calendar, CheckCircle2,
  AlertCircle, ExternalLink, UserCheck, Layers, FileText,
  ChevronRight, Briefcase,
} from 'lucide-react';
import {
  getOutcomesSummary, getOutcomesByChannel, getOutcomesByTier,
  getOutcomesByPlay, getOutcomesByPersona,
  syncSmartlead, getSmartleadStats,
  uploadLinkedinCSV, uploadCallsCSV, uploadEmailCSV,
  downloadLinkedinTemplate, downloadCallsTemplate, downloadEmailTemplate,
  OutcomesSummary, OutcomesByChannel, SmartleadStats, MeetingBrief,
} from '../services/api';
import { toast } from 'sonner';
import { getErrorMessage } from '../lib/errors';
import { ui } from '../lib/ui';

interface TierData {
  tier: string; total: number; replies: number;
  reply_rate: number; meetings_booked: number; conversion_rate: number;
}
interface PlayRow { play_id: string; play_name: string; replies: number; meetings: number; }
interface PersonaRow { persona_id: string; persona_name: string; replies: number; meetings: number; }

type Tab = 'summary' | 'email' | 'linkedin' | 'calls' | 'tiers' | 'plays' | 'personas';

const TABS: { key: Tab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'calls', label: 'Cold Calls', icon: Phone },
  { key: 'tiers', label: 'By Tier', icon: Layers },
  { key: 'plays', label: 'By Play', icon: Briefcase },
  { key: 'personas', label: 'By Persona', icon: UserCheck },
];

export function OutcomesDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState<OutcomesSummary | null>(null);
  const [byChannel, setByChannel] = useState<OutcomesByChannel | null>(null);
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [smartleadStats, setSmartleadStats] = useState<SmartleadStats[]>([]);
  const [plays, setPlays] = useState<PlayRow[]>([]);
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  // Meeting Brief modal
  const [brief] = useState<MeetingBrief | null>(null);
  const [briefLoading] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, channelRes, tierRes, statsRes, playsRes, personasRes] = await Promise.all([
        getOutcomesSummary(),
        getOutcomesByChannel(),
        getOutcomesByTier(),
        getSmartleadStats(),
        getOutcomesByPlay(),
        getOutcomesByPersona(),
      ]);
      setSummary(summaryRes.data);
      setByChannel(channelRes.data);
      setTiers(tierRes.data.tiers || []);
      setSmartleadStats(statsRes.data.stats || []);
      setPlays((playsRes.data as { by_play?: PlayRow[] }).by_play || []);
      setPersonas((personasRes.data as { by_persona?: PersonaRow[] }).by_persona || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load outcomes data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSyncSmartlead = async () => {
    setSyncing(true);
    try {
      await syncSmartlead();
      setLastSynced(new Date().toLocaleTimeString());
      toast.success('Smartlead data synced successfully');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sync Smartlead'));
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkedinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadLinkedinCSV(file);
      toast.success('LinkedIn CSV uploaded successfully');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload LinkedIn CSV'));
    }
  };

  const handleCallsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadCallsCSV(file);
      toast.success('Calls CSV uploaded successfully');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload calls CSV'));
    }
  };

  const handleEmailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadEmailCSV(file);
      toast.success('Email CSV uploaded successfully');
      loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload email CSV'));
    }
  };

  // ── Sub-components ────────────────────────────────────────────────────────

  const MetricCard = ({
    label, value, icon: Icon, color,
  }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) => (
    <div className={`${ui.statCard} rounded-2xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-secondary mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-40`} />
      </div>
    </div>
  );

  const TierBadge = ({ tier }: { tier: string }) => (
    <span className={`inline-block ${
      tier === 'T1' ? ui.badge.green :
      tier === 'T2' ? ui.badge.amber :
      tier === 'T3' ? ui.badge.neutral :
      ui.badge.neutral
    }`}>{tier}</span>
  );

  const EmptyState = ({ msg }: { msg: string }) => (
    <div className="bg-bg-section rounded-2xl border border-border p-8 text-center">
      <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-2" />
      <p className="text-sm text-text-secondary">{msg}</p>
    </div>
  );

  // ── Meeting Brief Modal ───────────────────────────────────────────────────

  const MeetingBriefModal = () => {
    if (!showBrief) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-green" />
              <span className="font-semibold text-text-primary">Meeting Brief</span>
            </div>
            <button onClick={() => setShowBrief(false)} className="text-text-muted hover:text-text-primary text-lg leading-none">✕</button>
          </div>

          <div className="p-6">
            {briefLoading && (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-secondary text-sm">Loading brief…</p>
              </div>
            )}
            {!briefLoading && !brief && (
              <EmptyState msg="No meeting brief found. Open the lead record and click 'Generate Meeting Brief' first." />
            )}
            {!briefLoading && brief && (
              <div className="space-y-5">
                {/* ICP fit */}
                <div className="bg-bg-section rounded-xl border border-border p-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ICP Fit</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-bg-section rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green rounded-full"
                        style={{ width: `${brief.content_json.icp_fit_score}%` }} />
                    </div>
                    <span className="text-sm font-bold text-brand-green w-12 text-right">{brief.content_json.icp_fit_score}%</span>
                    <TierBadge tier={brief.content_json.icp_tier} />
                  </div>
                  <p className="text-sm text-text-secondary">{brief.content_json.icp_fit_reason}</p>
                </div>

                {/* Company overview */}
                <div className="bg-bg-section rounded-xl border border-border p-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Company Overview</h3>
                  <p className="text-sm text-text-secondary">{brief.content_json.company_overview}</p>
                </div>

                {/* Active signals */}
                {brief.content_json.active_signals?.length > 0 && (
                  <div className="bg-bg-section rounded-xl border border-border p-4">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Active Buying Signals</h3>
                    <ul className="space-y-1">
                      {brief.content_json.active_signals.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <span className="text-green-400 mt-0.5">●</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conversation history */}
                {brief.content_json.conversation_history && (
                  <div className="bg-bg-section rounded-xl border border-border p-4">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Conversation History</h3>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{brief.content_json.conversation_history}</p>
                  </div>
                )}

                {/* Key talking points */}
                {brief.content_json.key_talking_points?.length > 0 && (
                  <div className="bg-bg-section rounded-xl border border-border p-4">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Key Talking Points</h3>
                    <ul className="space-y-1">
                      {brief.content_json.key_talking_points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <ChevronRight className="w-3 h-3 text-brand-green mt-1 flex-shrink-0" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Objections + questions in 2 cols */}
                <div className="grid grid-cols-2 gap-4">
                  {brief.content_json.likely_objections?.length > 0 && (
                    <div className="bg-bg-section rounded-xl border border-border p-4">
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Likely Objections</h3>
                      <ul className="space-y-1">
                        {brief.content_json.likely_objections.map((o, i) => (
                          <li key={i} className="text-xs text-amber-300">⚠ {o}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {brief.content_json.suggested_questions?.length > 0 && (
                    <div className="bg-bg-section rounded-xl border border-border p-4">
                      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Suggested Questions</h3>
                      <ul className="space-y-1">
                        {brief.content_json.suggested_questions.map((q, i) => (
                          <li key={i} className="text-xs text-brand-green">? {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <MeetingBriefModal />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-green" />
          <h1 className="text-2xl font-bold text-text-primary">Outcomes</h1>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className={`${ui.btnSecondary} p-2 disabled:opacity-50`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto pb-px">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
                : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </button>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {activeTab === 'summary' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Replies" value={summary.replied} icon={MessageSquare} color="text-brand-green" />
            <MetricCard label="Reply Rate" value={`${(summary.reply_rate * 100).toFixed(1)}%`} icon={TrendingUp} color="text-brand-green" />
            <MetricCard label="Meetings Booked" value={summary.meetings_booked} icon={Calendar} color="text-brand-blue" />
            <MetricCard label="Conversion Rate" value={`${(summary.conversion_rate * 100).toFixed(1)}%`} icon={CheckCircle2} color="text-brand-green" />
          </div>
          <div className="bg-bg-section rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Pipeline Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-text-muted mb-1">Total Leads</p><p className="text-xl font-bold text-text-secondary">{summary.total_leads}</p></div>
              <div><p className="text-xs text-text-muted mb-1">Contacted</p><p className="text-xl font-bold text-brand-green">{summary.contacted}</p></div>
            </div>
            {/* Funnel bar */}
            {summary.total_leads > 0 && (
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Contacted', val: summary.contacted, color: 'bg-blue-500' },
                  { label: 'Replied', val: summary.replied, color: 'bg-green-500' },
                  { label: 'Meetings', val: summary.meetings_booked, color: 'bg-purple-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-20">{label}</span>
                    <div className="flex-1 h-2 bg-bg-section rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, (val / summary.total_leads) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary w-8 text-right">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EMAIL (SMARTLEAD) ── */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSyncSmartlead}
              disabled={syncing}
              className={`${ui.btnPrimary} flex items-center gap-2 disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
            {lastSynced && <span className="text-xs text-text-muted">Last synced: {lastSynced}</span>}
          </div>

          {smartleadStats.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard label="Emails Sent" value={smartleadStats.reduce((s, x) => s + x.emails_sent, 0)} icon={Mail} color="text-brand-blue" />
                <MetricCard label="Opens" value={smartleadStats.reduce((s, x) => s + x.opens, 0)} icon={ExternalLink} color="text-brand-green" />
                <MetricCard label="Avg Open Rate" value={`${(smartleadStats.reduce((s, x) => s + x.open_rate, 0) / smartleadStats.length * 100).toFixed(1)}%`} icon={TrendingUp} color="text-brand-green" />
                <MetricCard label="Replies" value={smartleadStats.reduce((s, x) => s + x.replies, 0)} icon={MessageSquare} color="text-brand-green" />
                <MetricCard label="Avg Reply Rate" value={`${(smartleadStats.reduce((s, x) => s + x.reply_rate, 0) / smartleadStats.length * 100).toFixed(1)}%`} icon={TrendingUp} color="text-brand-green" />
                <MetricCard label="Meetings Booked" value={smartleadStats.reduce((s, x) => s + x.meetings_booked, 0)} icon={Calendar} color="text-brand-blue" />
              </div>

              {/* Campaign breakdown + A/B comparison */}
              <div className="bg-bg-section rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Campaign Performance (A/B Comparison)</h3>
                  <p className="text-xs text-text-secondary mt-0.5">Compare performance across campaigns and email variants</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Campaign</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Sent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Opens</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Open Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Replies</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Reply Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Meetings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smartleadStats.map((stat) => {
                        const topReplyRate = Math.max(...smartleadStats.map(s => s.reply_rate));
                        const isTop = stat.reply_rate >= topReplyRate && topReplyRate > 0;
                        return (
                          <tr key={stat.id} className="border-b border-border hover:bg-bg-section transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-text-secondary">{stat.campaign_name}</span>
                                {isTop && <span className={ui.badge.green}>Best</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">{stat.emails_sent}</td>
                            <td className="px-4 py-3 text-text-secondary">{stat.opens}</td>
                            <td className="px-4 py-3 text-text-secondary">{(stat.open_rate * 100).toFixed(1)}%</td>
                            <td className="px-4 py-3 text-text-secondary">{stat.replies}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-bg-section rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-green rounded-full"
                                    style={{ width: `${Math.min(100, stat.reply_rate * 100)}%` }} />
                                </div>
                                <span className="text-text-secondary text-xs">{(stat.reply_rate * 100).toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">{stat.meetings_booked}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <EmptyState msg="No Smartlead data. Configure your API key in workspace settings and sync." />
          )}

          {/* Manual Email CSV Upload */}
          <div className="bg-bg-section rounded-2xl border border-border p-5 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Manual Email Data</h3>
                <p className="text-xs text-text-secondary mt-0.5">Upload a CSV to log email outcomes not tracked by Smartlead</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadEmailTemplate()}
                  className={`${ui.btnSecondary} inline-flex items-center gap-2 text-xs`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Sample CSV
                </button>
                <label className={`${ui.btnPrimary} inline-flex items-center gap-2 cursor-pointer text-xs`}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleEmailUpload} />
                </label>
              </div>
            </div>
            <p className="text-xs text-text-muted">Format: lead_email, lead_name, company, date, status, notes</p>
          </div>
        </div>
      )}

      {/* ── LINKEDIN ── */}
      {activeTab === 'linkedin' && byChannel && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className={`${ui.btnPrimary} flex items-center gap-2 cursor-pointer`}>
              <Upload className="w-4 h-4" />
              Upload CSV
              <input type="file" accept=".csv" onChange={handleLinkedinUpload} className="hidden" />
            </label>
            <button onClick={downloadLinkedinTemplate} className={`${ui.btnSecondary} flex items-center gap-2`}>
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Attempted" value={byChannel.linkedin.attempted} icon={Users} color="text-brand-blue" />
            <MetricCard label="Replies" value={byChannel.linkedin.replies} icon={MessageSquare} color="text-brand-green" />
            <MetricCard label="Reply Rate" value={`${(byChannel.linkedin.reply_rate * 100).toFixed(1)}%`} icon={TrendingUp} color="text-brand-green" />
          </div>
          {byChannel.linkedin.meetings !== undefined && (
            <div className="bg-bg-section rounded-2xl border border-border p-4">
              <p className="text-xs text-text-muted mb-1">Meetings from LinkedIn</p>
              <p className="text-xl font-bold text-brand-blue">{byChannel.linkedin.meetings}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CALLS ── */}
      {activeTab === 'calls' && byChannel && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <label className={`${ui.btnPrimary} flex items-center gap-2 cursor-pointer`}>
              <Upload className="w-4 h-4" />
              Upload CSV
              <input type="file" accept=".csv" onChange={handleCallsUpload} className="hidden" />
            </label>
            <button onClick={downloadCallsTemplate} className={`${ui.btnSecondary} flex items-center gap-2`}>
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Attempted" value={byChannel.calls.attempted} icon={Users} color="text-brand-blue" />
            <MetricCard label="Replies" value={byChannel.calls.replies} icon={MessageSquare} color="text-brand-green" />
            <MetricCard label="Reply Rate" value={`${(byChannel.calls.reply_rate * 100).toFixed(1)}%`} icon={TrendingUp} color="text-brand-green" />
          </div>
        </div>
      )}

      {/* ── BY TIER ── */}
      {activeTab === 'tiers' && (
        tiers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.filter(t => ['T1','T2','T3'].includes(t.tier)).map((t) => (
                <div key={t.tier} className="bg-bg-section rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <TierBadge tier={t.tier} />
                    <span className="text-xs text-text-muted">{t.total} leads</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Reply Rate</span><span className="text-brand-green font-semibold">{(t.reply_rate * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Replies</span><span className="text-brand-green">{t.replies}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Meetings</span><span className="text-brand-blue">{t.meetings_booked}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Conversion</span><span className="text-brand-green">{(t.conversion_rate * 100).toFixed(1)}%</span></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-bg-section rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Total Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Replies</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Reply Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Meetings</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Conversion</th>
                </tr></thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier.tier} className="border-b border-border hover:bg-bg-section transition-colors">
                      <td className="px-4 py-3"><TierBadge tier={tier.tier} /></td>
                      <td className="px-4 py-3 text-text-secondary">{tier.total}</td>
                      <td className="px-4 py-3 text-text-secondary">{tier.replies}</td>
                      <td className="px-4 py-3 text-text-secondary">{(tier.reply_rate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-text-secondary">{tier.meetings_booked}</td>
                      <td className="px-4 py-3 text-text-secondary">{(tier.conversion_rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <EmptyState msg="No tier data. Run ICP scoring to generate tiers." />
      )}

      {/* ── BY PLAY ── */}
      {activeTab === 'plays' && (
        plays.length > 0 ? (
          <div className="bg-bg-section rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Performance by Messaging Play</h3>
              <p className="text-xs text-text-secondary mt-0.5">Which plays are generating the most replies and meetings?</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Play</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Replies</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Meetings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Performance</th>
              </tr></thead>
              <tbody>
                {[...plays].sort((a, b) => b.replies - a.replies).map((p) => {
                  const maxReplies = Math.max(...plays.map(x => x.replies), 1);
                  return (
                    <tr key={p.play_id} className="border-b border-border hover:bg-bg-section transition-colors">
                      <td className="px-4 py-3 text-text-secondary font-medium">{p.play_name}</td>
                      <td className="px-4 py-3 text-brand-green font-semibold">{p.replies}</td>
                      <td className="px-4 py-3 text-brand-blue">{p.meetings}</td>
                      <td className="px-4 py-3 w-40">
                        <div className="h-2 bg-bg-section rounded-full overflow-hidden">
                          <div className="h-full bg-brand-green rounded-full"
                            style={{ width: `${(p.replies / maxReplies) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState msg="No play data yet. Log activities linked to plays to see performance breakdowns." />
      )}

      {/* ── BY PERSONA ── */}
      {activeTab === 'personas' && (
        personas.length > 0 ? (
          <div className="bg-bg-section rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Performance by Persona</h3>
              <p className="text-xs text-text-secondary mt-0.5">Which buyer roles are responding best to your outreach?</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Persona</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Replies</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Meetings</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted">Engagement</th>
              </tr></thead>
              <tbody>
                {[...personas].sort((a, b) => b.replies - a.replies).map((p) => {
                  const maxReplies = Math.max(...personas.map(x => x.replies), 1);
                  return (
                    <tr key={p.persona_id} className="border-b border-border hover:bg-bg-section transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary font-medium">{p.persona_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brand-green font-semibold">{p.replies}</td>
                      <td className="px-4 py-3 text-brand-blue">{p.meetings}</td>
                      <td className="px-4 py-3 w-40">
                        <div className="h-2 bg-bg-section rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${(p.replies / maxReplies) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState msg="No persona data yet. Create personas in GTM Intelligence and link them to messaging plays." />
      )}
    </div>
  );
}
