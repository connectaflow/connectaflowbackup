import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Mail,
  Linkedin,
  Phone,
  Filter,
  Search,
  Upload,
  Download,
  Plus,
  X,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Check,
  FileText,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import api, {
  listReplies,
  createReply,
  getReplyInsights,
  uploadRepliesCSV,
  generateMeetingBrief,
  getMeetingBrief,
  type Reply,
  type MeetingBrief,
} from '../services/api';
import { getErrorMessage } from '../lib/errors';
import { ui } from '../lib/ui';

type ReplyChannel = 'email' | 'linkedin' | 'call';
type ReplySource = 'smartlead' | 'manual_csv' | 'manual_entry';

export function RepliesInbox() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<{
    sentiment_split: Record<string, number>;
    top_objections: string[];
    total_replies: number;
  } | null>(null);
  const [selectedReply, setSelectedReply] = useState<Reply | null>(null);
  const [filterChannel, setFilterChannel] = useState<'all' | ReplyChannel>('all');
  const [filterClassification, setFilterClassification] = useState<'all' | 'interested' | 'objection' | 'neutral' | 'ooo'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [logForm, setLogForm] = useState<{
    lead_email: string;
    channel: ReplyChannel;
    reply_text: string;
    source: ReplySource;
  }>({
    lead_email: '',
    channel: 'email',
    reply_text: '',
    source: 'manual_entry'
  });
  const [drawerNote, setDrawerNote] = useState('');
  const [drawerFollowUp, setDrawerFollowUp] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [viewingBrief, setViewingBrief] = useState(false);
  const [brief, setBrief] = useState<MeetingBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadChannel, setUploadChannel] = useState<ReplyChannel>('email');
  const autoReloadInterval = useRef<NodeJS.Timeout | null>(null);

  const formatTimeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getClassificationBadge = (classification: string | null): React.ReactNode => {
    if (!classification) {
      return (
        <span className={`px-2 py-1 text-xs rounded-full ${ui.badge.neutral}`}>
          Classifying...
        </span>
      );
    }

    const styles: Record<string, string> = {
      interested: ui.badge.green,
      objection: ui.badge.red,
      neutral: ui.badge.neutral,
      ooo: ui.badge.amber,
    };

    const style = styles[classification] || ui.badge.neutral;
    const displayText = classification.charAt(0).toUpperCase() + classification.slice(1);

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${style}`}>
        {displayText}
      </span>
    );
  };

  const fetchReplies = useCallback(async () => {
    try {
      setLoading(true);
      const channel = filterChannel === 'all' ? undefined : filterChannel;
      const classification =
        filterClassification === 'all' ? undefined : filterClassification;

      const { data } = await listReplies({
        channel,
        classification,
        skip: 0,
        limit: 50
      });

      const filtered = data.replies.filter((reply) => {
        if (!searchQ) return true;
        const query = searchQ.toLowerCase();
        return (
          (reply.lead?.name?.toLowerCase().includes(query) ?? false) ||
          (reply.lead?.domain?.toLowerCase().includes(query) ?? false) ||
          (reply.reply_text?.toLowerCase().includes(query) ?? false)
        );
      });

      setReplies(filtered);
      setTotal(data.total);
    } catch (error) {
      toast.error(`Failed to load replies: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterClassification, searchQ]);

  const fetchInsights = useCallback(async () => {
    try {
      const { data } = await getReplyInsights();
      setInsights(data);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }, []);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useEffect(() => {
    autoReloadInterval.current = setInterval(() => {
      fetchReplies();
    }, 10000);

    return () => {
      if (autoReloadInterval.current) {
        clearInterval(autoReloadInterval.current);
      }
    };
  }, [fetchReplies]);

  const handleLogReply = async () => {
    if (!logForm.reply_text.trim()) {
      toast.error('Reply text is required');
      return;
    }

    try {
      await createReply({
        lead_email: logForm.lead_email || undefined,
        channel: logForm.channel,
        reply_text: logForm.reply_text,
        source: logForm.source
      });

      toast.success('Reply logged successfully');
      setShowLogModal(false);
      setLogForm({
        lead_email: '',
        channel: 'email',
        reply_text: '',
        source: 'manual_entry'
      });
      fetchReplies();
    } catch (error) {
      toast.error(`Failed to log reply: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleUploadCSV = async () => {
    if (!uploadedFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      const { data: result } = await uploadRepliesCSV(uploadedFile, uploadChannel as 'email' | 'linkedin' | 'call');
      toast.success(`Uploaded ${result.created} replies`);
      setShowUploadModal(false);
      setUploadedFile(null);
      setUploadChannel('email');
      fetchReplies();
    } catch (error) {
      toast.error(`Failed to upload CSV: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleMarkMeetingBooked = async () => {
    if (!selectedReply?.lead_id) return;

    try {
      setGeneratingBrief(true);
      await api.patch(`/leads/${selectedReply.lead_id}`, {
        status: 'Meeting Booked'
      });
      await generateMeetingBrief(selectedReply.lead_id);
      toast.success('Meeting marked as booked — brief generated');
      fetchReplies();
    } catch (error) {
      toast.error(`Failed to mark meeting: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleViewBrief = async () => {
    if (!selectedReply?.lead_id) return;
    setViewingBrief(true);
    setBrief(null);
    setBriefLoading(true);
    try {
      const { data } = await getMeetingBrief(selectedReply.lead_id);
      setBrief(data);
    } catch {
      toast.error('No brief found. Mark as Meeting Booked first to generate one.');
      setViewingBrief(false);
    } finally {
      setBriefLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedReply?.lead_id) return;

    try {
      await api.patch(`/leads/${selectedReply.lead_id}`, {
        custom_data: { notes: drawerNote }
      });
      toast.success('Note saved');
      setDrawerNote('');
    } catch (error) {
      toast.error(`Failed to save note: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!selectedReply?.lead_id) return;

    try {
      await api.patch(`/leads/${selectedReply.lead_id}`, {
        follow_up_date: drawerFollowUp
      });
      toast.success('Follow-up date set');
      setDrawerFollowUp('');
    } catch (error) {
      toast.error(`Failed to set follow-up: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const insightsLoading = !insights;

  return (
    <div className="flex flex-col h-full bg-bg-card text-text-primary">
      {/* Insights Bar */}
      <div className="bg-bg-section border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-brand-green" />
            <h3 className="font-semibold">Reply Insights</h3>
          </div>
          <button
            onClick={() => setInsightsCollapsed(!insightsCollapsed)}
            className="p-1 hover:bg-bg-section rounded transition"
          >
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                insightsCollapsed ? '' : 'rotate-90'
              }`}
            />
          </button>
        </div>

        {!insightsCollapsed && (
          <div className="px-6 pb-4 space-y-4">
            {insightsLoading ? (
              <div className="h-24 bg-bg-section rounded animate-pulse" />
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="flex-1 px-4 py-3 rounded-lg bg-bg-section border border-border">
                    <div className="text-xs text-text-muted mb-1">Interested</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {insights?.sentiment_split?.interested ?? 0}
                    </div>
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-lg bg-bg-section border border-border">
                    <div className="text-xs text-text-muted mb-1">Objection</div>
                    <div className="text-2xl font-bold text-red-400">
                      {insights?.sentiment_split?.objection ?? 0}
                    </div>
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-lg bg-bg-section border border-border">
                    <div className="text-xs text-text-muted mb-1">Neutral</div>
                    <div className="text-2xl font-bold text-text-secondary">
                      {insights?.sentiment_split?.neutral ?? 0}
                    </div>
                  </div>
                  <div className="flex-1 px-4 py-3 rounded-lg bg-bg-section border border-border">
                    <div className="text-xs text-text-muted mb-1">OOO</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {insights?.sentiment_split?.ooo ?? 0}
                    </div>
                  </div>
                </div>

                {insights?.top_objections && insights.top_objections.length > 0 && (
                  <div>
                    <div className="text-xs text-text-muted mb-2">Top Objections</div>
                    <div className="flex flex-wrap gap-2">
                      {insights.top_objections.slice(0, 3).map((objection, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/30"
                        >
                          {objection}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter + Action Bar */}
      <div className="bg-bg-section border-b border-border px-6 py-3 flex flex-wrap items-center gap-3">
        {/* Channel filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
          <div className="flex gap-1.5">
            {(['all', 'email', 'linkedin', 'call'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filterChannel === ch
                    ? ui.tab.active
                    : ui.tab.inactive
                }`}
              >
                {ch === 'all' ? 'All Channels' : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {['all', 'T1', 'T2', 'T3'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filterTier === t
                  ? ui.tab.active
                  : ui.tab.inactive
              }`}
            >
              {t === 'all' ? 'All Tiers' : t}
            </button>
          ))}
        </div>

        {/* Classification filter */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1.5">
            {(['all', 'interested', 'objection', 'neutral', 'ooo'] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterClassification(cls)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  filterClassification === cls
                    ? ui.tab.active
                    : ui.tab.inactive
                }`}
              >
                {cls === 'all' ? 'All Types' : cls.charAt(0).toUpperCase() + cls.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[220px] flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQ}
            onChange={(event) => setSearchQ(event.target.value)}
            placeholder="Search lead, company, or reply text"
            className={`${ui.input} py-2.5 pl-9`}
          />
        </div>

        <div className="text-xs text-text-muted">
          Showing {replies.length} of {total}
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowLogModal(true)}
            className={`flex items-center gap-2 ${ui.btnPrimary}`}
          >
            <Plus className="w-4 h-4" />
            Log Reply
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className={`flex items-center gap-2 ${ui.btnSecondary}`}
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
        </div>
      </div>

      {/* Replies Table */}
      <div className="flex-1 overflow-y-auto">
        {loading && !replies.length ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-text-muted mx-auto animate-spin mb-2" />
              <p className="text-text-secondary">Loading replies...</p>
            </div>
          </div>
        ) : replies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary">No replies found</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Table Headers */}
            <div className="sticky top-0 bg-bg-section border-b border-border px-6 py-3 flex items-center gap-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <div className="flex-1 min-w-32">Lead</div>
              <div className="flex-1 min-w-40">Company</div>
              <div className="w-20">Channel</div>
              <div className="flex-1 min-w-64">Preview</div>
              <div className="w-28">Classification</div>
              <div className="w-20">Time</div>
            </div>

            {/* Table Rows */}
            {replies.map((reply) => (
              <div
                key={reply.id}
                onClick={() => setSelectedReply(reply)}
                className={`px-6 py-4 border-b border-border cursor-pointer transition hover:bg-bg-section flex items-center gap-4 ${
                  selectedReply?.id === reply.id ? 'bg-bg-section' : ''
                }`}
              >
                <div className="flex-1 min-w-32">
                  <div className="font-medium text-text-primary truncate">
                    {reply.lead?.name || 'Unknown Lead'}
                  </div>
                  <div className="text-xs text-text-secondary truncate">{reply.lead?.email}</div>
                </div>

                <div className="flex-1 min-w-40 text-text-secondary truncate text-sm">
                  {reply.lead?.domain || '—'}
                </div>

                <div className="w-20 flex items-center justify-center text-brand-green">
                  {getChannelIcon(reply.channel)}
                </div>

                <div className="flex-1 min-w-64 text-text-secondary text-sm truncate">
                  {reply.reply_text ? reply.reply_text.substring(0, 80) : ''}
                  {reply.reply_text && reply.reply_text.length > 80 ? '...' : ''}
                </div>

                <div className="w-28">{getClassificationBadge(reply.classification)}</div>

                <div className="w-20 text-text-muted text-xs text-right">
                  {reply.received_at ? formatTimeAgo(reply.received_at) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedReply && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-bg-card border-l border-border shadow-xl overflow-y-auto z-50">
          <div className="sticky top-0 bg-bg-section border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Reply Details</h3>
            <button
              onClick={() => setSelectedReply(null)}
              className="p-1 hover:bg-bg-section rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Lead Info */}
            <div>
              <div className="font-semibold text-text-primary mb-2">
                {selectedReply.lead?.name || 'Unknown Lead'}
              </div>
              <div className="text-sm text-text-secondary mb-3">{selectedReply.lead?.domain}</div>
              <div className={`inline-block px-2 py-1 text-xs rounded-full ${ui.badge.neutral}`}>
                Lead
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-xs font-semibold text-text-muted mb-2 uppercase">
                Reply Text
              </div>
              <div className="max-h-48 overflow-y-auto bg-bg-section rounded p-3 text-sm text-text-secondary border border-border">
                {selectedReply.reply_text}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getChannelIcon(selectedReply.channel)}
                <span className="text-sm text-text-secondary capitalize">
                  {selectedReply.channel}
                </span>
              </div>
              <div>{getClassificationBadge(selectedReply.classification)}</div>
            </div>

            {selectedReply.play_id && (
              <div className="text-sm">
                <span className="text-text-secondary">Play: </span>
                <span className="text-brand-green font-mono text-xs">{selectedReply.play_id}</span>
              </div>
            )}

            {selectedReply.lead_id && (
              <>
                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkMeetingBooked}
                      disabled={generatingBrief}
                      className="flex-1 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {generatingBrief ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {generatingBrief ? 'Generating…' : 'Mark Meeting Booked'}
                    </button>
                    <button
                      onClick={handleViewBrief}
                      className="px-3 py-2 rounded-lg bg-brand-green/10 hover:bg-brand-green/20 text-brand-green transition flex items-center gap-1.5 text-sm"
                      title="View Meeting Brief"
                    >
                      <FileText className="w-4 h-4" />
                      Brief
                    </button>
                  </div>

                  {/* Meeting brief panel */}
                  {viewingBrief && (
                    <div className="bg-bg-section rounded-xl border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-brand-green" />
                          <span className="text-sm font-semibold text-text-primary">Meeting Brief</span>
                        </div>
                        <button onClick={() => setViewingBrief(false)} className="text-text-secondary hover:text-text-primary text-xs">✕</button>
                      </div>
                      <div className="p-3 max-h-80 overflow-y-auto space-y-3">
                        {briefLoading && (
                          <div className="text-center py-4">
                            <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                            <p className="text-xs text-text-secondary">Loading…</p>
                          </div>
                        )}
                        {!briefLoading && brief && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-bg-section rounded-full overflow-hidden">
                                <div className="h-full bg-brand-green rounded-full"
                                  style={{ width: `${brief.content_json.icp_fit_score}%` }} />
                              </div>
                              <span className="text-xs font-bold text-brand-green">{brief.content_json.icp_fit_score}% ICP Fit</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                brief.content_json.icp_tier === 'T1' ? 'bg-emerald-500/20 text-emerald-400' :
                                brief.content_json.icp_tier === 'T2' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-bg-section text-text-muted'
                              }`}>{brief.content_json.icp_tier}</span>
                            </div>
                            <p className="text-xs text-text-secondary">{brief.content_json.company_overview}</p>
                            {brief.content_json.active_signals?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-text-muted mb-1">Active Signals</p>
                                {brief.content_json.active_signals.slice(0, 3).map((s, i) => (
                                  <p key={i} className="text-xs text-green-300">● {s}</p>
                                ))}
                              </div>
                            )}
                            {brief.content_json.key_talking_points?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-text-muted mb-1">Talking Points</p>
                                {brief.content_json.key_talking_points.slice(0, 3).map((p, i) => (
                                  <p key={i} className="text-xs text-brand-green">› {p}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">
                      Add Note
                    </label>
                    <textarea
                      value={drawerNote}
                      onChange={(e) => setDrawerNote(e.target.value)}
                      placeholder="Enter note..."
                      className={`${ui.textarea} text-sm`}
                      rows={3}
                    />
                    <button
                      onClick={handleSaveNote}
                      className={`mt-2 w-full px-3 py-1 rounded text-sm font-medium ${ui.btnPrimary}`}
                    >
                      Save Note
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-2 uppercase">
                      Set Follow-up
                    </label>
                    <input
                      type="date"
                      value={drawerFollowUp}
                      onChange={(e) => setDrawerFollowUp(e.target.value)}
                      className={`${ui.input} text-sm`}
                    />
                    <button
                      onClick={handleSaveFollowUp}
                      className={`mt-2 w-full px-3 py-1 rounded text-sm font-medium ${ui.btnPrimary}`}
                    >
                      Set Date
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Log Reply Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Log Reply</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Lead Email (Optional)
                </label>
                <input
                  type="email"
                  value={logForm.lead_email}
                  onChange={(e) => setLogForm({ ...logForm, lead_email: e.target.value })}
                  placeholder="search@example.com"
                  className={ui.input}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Channel
                </label>
                <select
                  value={logForm.channel}
                  onChange={(e) => setLogForm({ ...logForm, channel: e.target.value as ReplyChannel })}
                  className={ui.select}
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="call">Call</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Reply Text
                </label>
                <textarea
                  value={logForm.reply_text}
                  onChange={(e) => setLogForm({ ...logForm, reply_text: e.target.value })}
                  placeholder="Enter reply text..."
                  className={ui.textarea}
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowLogModal(false);
                  setLogForm({
                    lead_email: '',
                    channel: 'email',
                    reply_text: '',
                    source: 'manual_entry'
                  });
                }}
                className={`flex-1 ${ui.btnSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogReply}
                className={`flex-1 ${ui.btnPrimary}`}
              >
                Log Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Upload Replies CSV</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Channel
                </label>
                  <select
                    value={uploadChannel}
                    onChange={(e) => setUploadChannel(e.target.value as ReplyChannel)}
                    className={ui.select}
                  >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="call">Call</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  className={`${ui.input} text-sm file:bg-bg-section file:border-0 file:text-text-primary file:font-medium file:cursor-pointer`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/replies/sample-csv`;
                  window.open(url, '_blank');
                }}
                className={`inline-flex items-center gap-2 ${ui.btnSecondary} text-xs`}
              >
                <Download className="w-3.5 h-3.5" />
                Download sample CSV
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFile(null);
                  setUploadChannel('email');
                }}
                className={`flex-1 ${ui.btnSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadCSV}
                className={`flex-1 ${ui.btnPrimary}`}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
