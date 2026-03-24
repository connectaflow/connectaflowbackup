"use client";

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDashed,
  Database,
  Download,
  FlaskRound,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { AICopilot } from './AICopilot';
import { EnrichmentDashboard } from './EnrichmentDashboard';
import { GTMIntelligence } from './GTMIntelligence';
import { LeadTable } from './LeadTable';
import { OutcomesDashboard } from './OutcomesDashboard';
import { PlaybookManager } from './PlaybookManager';
import { PlaysMessagingStudio } from './PlaysMessagingStudio';
import { RepliesInbox } from './RepliesInbox';
import { SignalQueue } from './SignalQueue';
import {
  createWorkspace,
  exportEnrichedCSV,
  getActiveWorkspaceId,
  getProfiles,
  getSignalQueue,
  listGTMContexts,
  listPlaybooks,
  listWorkspaces,
  seedWorkspaceDemo,
  setActiveWorkspaceId,
  updateWorkspace,
  type GTMContextSummary,
  type WorkspaceData,
} from '../services/api';
import { getErrorMessage } from '../lib/errors';
import { ui } from '../lib/ui';

type Screen =
  | 'gtm-context'
  | 'playbooks'
  | 'enrichment'
  | 'signals'
  | 'leads'
  | 'analytics'
  | 'replies'
  | 'plays-messaging';

const NAV_ITEMS: { key: Screen; label: string; icon: typeof Sparkles; desc: string }[] = [
  { key: 'gtm-context', label: 'Mission', icon: Target, desc: 'Define strategy, ICPs, personas, and signal logic.' },
  { key: 'enrichment', label: 'Accounts', icon: Sparkles, desc: 'Import and enrich target companies.' },
  { key: 'signals', label: 'Queue', icon: Radio, desc: 'Review timing signals and urgency.' },
  { key: 'plays-messaging', label: 'Messaging', icon: Wand2, desc: 'Build messaging plays and variants.' },
  { key: 'leads', label: 'Records', icon: Database, desc: 'Maintain contacts, notes, and follow-ups.' },
  { key: 'replies', label: 'Replies', icon: MessageSquare, desc: 'Track inbound responses and meeting prep.' },
  { key: 'analytics', label: 'Outcomes', icon: BarChart3, desc: 'Monitor conversion health and learnings.' },
  { key: 'playbooks', label: 'Playbooks', icon: BookOpen, desc: 'Operationalize execution paths.' },
];

const SAMPLE_DOMAIN_SET = [
  'figma.com',
  'linear.app',
  'vanta.com',
  'merge.dev',
  'gong.io',
  'ramp.com',
].join('\n');

type WorkspaceSettingsDraft = {
  smartlead_api_key: string;
  smartlead_base_url: string;
  cooldown_contact_threshold: string;
  cooldown_months: string;
};

type ActionLink = { label: string; screen: Screen };
type ActionButton = { label: string; action: () => void };
type NextAction = {
  title: string;
  body: string;
  primary: ActionLink;
  secondary: ActionLink | ActionButton;
};

function isActionLink(action: ActionLink | ActionButton): action is ActionLink {
  return 'screen' in action;
}

export function ControlPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialScreen = searchParams.get('screen');
  const resolvedInitialScreen = NAV_ITEMS.some((item) => item.key === initialScreen)
    ? (initialScreen as Screen)
    : 'gtm-context';

  const [activeScreen, setActiveScreen] = useState<Screen>(resolvedInitialScreen);
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [preferredGtmContextId, setPreferredGtmContextId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [bootstrappingDemo, setBootstrappingDemo] = useState(false);
  const [demoDomainsSeed, setDemoDomainsSeed] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [summary, setSummary] = useState({
    contexts: 0,
    playbooks: 0,
    enrichedCompanies: 0,
    signaledCompanies: 0,
  });
  const [activeContext, setActiveContext] = useState<GTMContextSummary | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<WorkspaceSettingsDraft>({
    smartlead_api_key: '',
    smartlead_base_url: 'https://server.smartlead.ai/api/v1',
    cooldown_contact_threshold: '3',
    cooldown_months: '6',
  });

  useEffect(() => {
    const nextScreen = searchParams.get('screen');
    if (nextScreen && NAV_ITEMS.some((item) => item.key === nextScreen) && nextScreen !== activeScreen) {
      setActiveScreen(nextScreen as Screen);
    }
  }, [activeScreen, searchParams]);

  const navigateToScreen = useCallback((screen: Screen) => {
    setActiveScreen(screen);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('screen', screen);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const [contextsResp, playbooksResp, profilesResp, signalsResp, workspacesResp] = await Promise.all([
        listGTMContexts().catch(() => ({ data: { contexts: [] } })),
        listPlaybooks().catch(() => ({ data: { playbooks: [] } })),
        getProfiles(0, 1).catch(() => ({ data: { profiles: [], total: 0 } })),
        getSignalQueue(undefined, 1).catch(() => ({ data: { queue: [], total: 0 } })),
        listWorkspaces().catch(() => ({ data: { workspaces: [] } })),
      ]);

      const availableWorkspaces = workspacesResp.data.workspaces || [];
      const storedWorkspace = getActiveWorkspaceId();
      const resolvedWorkspace = storedWorkspace && availableWorkspaces.some((ws) => ws.id === storedWorkspace)
        ? storedWorkspace
        : availableWorkspaces[0]?.id ?? null;

      if (resolvedWorkspace) {
        setWorkspaceId(resolvedWorkspace);
        setActiveWorkspaceId(resolvedWorkspace);
      }

      setWorkspaces(availableWorkspaces);

      const contexts = contextsResp.data.contexts || [];
      if (!preferredGtmContextId && contexts.length > 0) {
  setPreferredGtmContextId(contexts[0].id);
}
      const chosenContext = contexts.find((ctx) => ctx.id === preferredGtmContextId)
        || [...contexts].sort((a, b) => (
          (b.persona_count + b.trigger_count + b.play_count) - (a.persona_count + a.trigger_count + a.play_count)
        ))[0]
        || null;

      setActiveContext(chosenContext);
      setSelectedIcpId(chosenContext?.icp_id || null);
      setSummary({
        contexts: contexts.length,
        playbooks: (playbooksResp.data.playbooks || []).length,
        enrichedCompanies: profilesResp.data.total || 0,
        signaledCompanies: signalsResp.data.total || 0,
      });
    } finally {
      setLoadingSummary(false);
    }
  }, [preferredGtmContextId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId) || null,
    [workspaceId, workspaces],
  );

  useEffect(() => {
    const settings = (activeWorkspace?.settings || {}) as Record<string, unknown>;
    setSettingsDraft({
      smartlead_api_key: typeof settings.smartlead_api_key === 'string' ? settings.smartlead_api_key : '',
      smartlead_base_url: typeof settings.smartlead_base_url === 'string' ? settings.smartlead_base_url : 'https://server.smartlead.ai/api/v1',
      cooldown_contact_threshold: String(settings.cooldown_contact_threshold ?? 3),
      cooldown_months: String(settings.cooldown_months ?? 6),
    });
  }, [activeWorkspace]);

  const handleWorkspaceChange = (nextWorkspaceId: string) => {
    setWorkspaceId(nextWorkspaceId);
    setActiveWorkspaceId(nextWorkspaceId);
    setSelectedIcpId(null);
    setPreferredGtmContextId(null);
    setWorkspaceVersion((version) => version + 1);
    void loadSummary();
  };

  const handleCreateWorkspace = async () => {
    const name = window.prompt('Name the new workspace');
    if (!name?.trim()) return;

    try {
      const { data } = await createWorkspace({ name: name.trim() });
      toast.success('Workspace created');
      handleWorkspaceChange(data.id);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create workspace'));
    }
  };

  const handleSeedWorkspace = useCallback(async () => {
    if (!workspaceId) return;

    setBootstrappingDemo(true);
    try {
      const { data } = await seedWorkspaceDemo(workspaceId);
      setPreferredGtmContextId(data.mission_id);
      setSelectedIcpId(data.primary_icp_id);
      setDemoDomainsSeed(SAMPLE_DOMAIN_SET);
      setWorkspaceVersion((version) => version + 1);
      await loadSummary();
      toast.success('Sample workspace is ready');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to load sample data'));
    } finally {
      setBootstrappingDemo(false);
    }
  }, [loadSummary, workspaceId]);

  const handleSaveSettings = async () => {
    if (!workspaceId || !activeWorkspace) return;

    setSavingSettings(true);
    try {
      const settings = {
        ...(activeWorkspace.settings || {}),
        smartlead_api_key: settingsDraft.smartlead_api_key.trim(),
        smartlead_base_url: settingsDraft.smartlead_base_url.trim() || 'https://server.smartlead.ai/api/v1',
        cooldown_contact_threshold: Math.max(1, Number(settingsDraft.cooldown_contact_threshold || 3)),
        cooldown_months: Math.max(1, Number(settingsDraft.cooldown_months || 6)),
      };

      await updateWorkspace(workspaceId, { settings });
      await loadSummary();
      setShowSettings(false);
      toast.success('Workspace settings updated');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  const stageStates = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      if (item.key === 'gtm-context') {
        return {
          ...item,
          done: summary.contexts > 0,
          helper: summary.contexts > 0
            ? `${summary.contexts} mission${summary.contexts === 1 ? '' : 's'} defined`
            : 'Create the core mission and ICP',
        };
      }
      if (item.key === 'enrichment') {
        return {
          ...item,
          done: summary.enrichedCompanies > 0,
          helper: summary.enrichedCompanies > 0
            ? `${summary.enrichedCompanies} enriched account${summary.enrichedCompanies === 1 ? '' : 's'}`
            : 'Import or seed account data',
        };
      }
      if (item.key === 'signals') {
        return {
          ...item,
          done: summary.signaledCompanies > 0,
          helper: summary.signaledCompanies > 0
            ? `${summary.signaledCompanies} accounts in queue`
            : 'Detect timing signals worth acting on',
        };
      }
      if (item.key === 'playbooks') {
        return {
          ...item,
          done: summary.playbooks > 0,
          helper: summary.playbooks > 0
            ? `${summary.playbooks} playbook${summary.playbooks === 1 ? '' : 's'} ready`
            : 'Add an executable motion',
        };
      }
      return {
        ...item,
        done: false,
        helper: item.desc,
      };
    });
  }, [summary]);

  const nextAction = useMemo<NextAction>(() => {
    if (!summary.contexts) {
      return {
        title: 'Define the mission',
        body: 'Set the thesis, ICP, and personas before scoring or prioritizing accounts.',
        primary: { label: 'Open Mission', screen: 'gtm-context' as Screen },
        secondary: { label: 'Load sample workspace', action: handleSeedWorkspace },
      };
    }
    if (!summary.enrichedCompanies) {
      return {
        title: 'Bring in accounts',
        body: 'Seed or import target companies so the system has real evidence to work with.',
        primary: { label: 'Open Accounts', screen: 'enrichment' as Screen },
        secondary: {
          label: 'Paste sample domains',
          action: () => {
            setDemoDomainsSeed(SAMPLE_DOMAIN_SET);
            navigateToScreen('enrichment');
            setWorkspaceVersion((version) => version + 1);
            toast.success('Sample domains are ready in Accounts');
          },
        },
      };
    }
    if (!summary.signaledCompanies) {
      return {
        title: 'Review the queue',
        body: 'Once accounts exist, move to urgency and verify which ones deserve attention now.',
        primary: { label: 'Open Queue', screen: 'signals' as Screen },
        secondary: { label: 'Open Records', screen: 'leads' as Screen },
      };
    }
    if (!summary.playbooks) {
      return {
        title: 'Operationalize the motion',
        body: 'Attach a playbook so the highest-confidence records become executable work.',
        primary: { label: 'Open Playbooks', screen: 'playbooks' as Screen },
        secondary: { label: 'Open Messaging', screen: 'plays-messaging' as Screen },
      };
    }
    return {
      title: 'Work the best records',
      body: 'Tighten notes, check replies, and move the strongest accounts into booked meetings.',
      primary: { label: 'Open Records', screen: 'leads' as Screen },
      secondary: { label: 'Review Outcomes', screen: 'analytics' as Screen },
    };
  }, [handleSeedWorkspace, navigateToScreen, summary]);

  const activeModule = NAV_ITEMS.find((item) => item.key === activeScreen) || NAV_ITEMS[0];
  const secondaryAction = nextAction.secondary;

  return (
    <div className="flex min-h-screen bg-bg text-text-primary" id="control-panel">
      <aside className={`${sidebarCollapsed ? 'w-[92px]' : 'w-[280px]'} shrink-0 border-r border-border bg-bg-card transition-[width] duration-200`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="app-logo-frame overflow-hidden rounded-xl">
                <Image src="/logo.jpg" alt="Connectaflow" width={40} height={40} className="h-10 w-10 object-cover" priority />
              </div>

              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">Connectaflow</h1>
                  <p className="text-[11px] text-text-muted">Signal-led GTM workspace</p>
                </div>
              )}

              <button
                onClick={() => setSidebarCollapsed((value) => !value)}
                className={`ml-auto ${ui.btnSecondary} p-2`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>

            {!sidebarCollapsed && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className={ui.label}>Workspace</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-section hover:text-text-primary"
                      title="Workspace settings"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCreateWorkspace}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-bg-section hover:text-text-primary"
                      title="Create workspace"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <select
                    value={workspaceId || ''}
                    onChange={(event) => handleWorkspaceChange(event.target.value)}
                    className={`${ui.select} py-2.5 pl-9 pr-4`}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {stageStates.map((item, index) => (
              <button
                key={item.key}
                onClick={() => navigateToScreen(item.key)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  activeScreen === item.key
                    ? 'border-brand-green/20 bg-brand-green/8 text-text-primary'
                    : 'border-transparent text-text-secondary hover:border-border hover:bg-bg-section hover:text-text-primary'
                }`}
                title={sidebarCollapsed ? `${item.label}: ${item.helper}` : undefined}
              >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <item.icon className={`h-[18px] w-[18px] ${activeScreen === item.key ? 'text-brand-green' : 'text-text-muted'}`} />

                  {!sidebarCollapsed && (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-text-muted">0{index + 1}</span>
                          <span className="truncate text-[13px] font-semibold">{item.label}</span>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-text-muted">{item.helper}</p>
                      </div>
                      {item.done
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-green" />
                        : <CircleDashed className="h-4 w-4 shrink-0 text-text-muted" />}
                    </>
                  )}
                </div>
              </button>
            ))}
          </nav>

          <div className="space-y-2 border-t border-border p-3">
            <button
              onClick={() => void handleSeedWorkspace()}
              disabled={bootstrappingDemo || !workspaceId}
              className={`flex w-full items-center justify-center gap-2 ${ui.btnPrimary} py-2.5`}
            >
              {bootstrappingDemo ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskRound className="h-4 w-4" />}
              {!sidebarCollapsed && 'Load sample workspace'}
            </button>

            <button
              onClick={() => {
                setDemoDomainsSeed(SAMPLE_DOMAIN_SET);
                navigateToScreen('enrichment');
                setWorkspaceVersion((version) => version + 1);
                toast.success('Sample domains are ready in Accounts');
              }}
              className={`w-full ${ui.btnSecondary} py-2.5`}
            >
              {sidebarCollapsed ? 'Seed' : 'Paste sample domains'}
            </button>

            <button
              onClick={() => {
                exportEnrichedCSV();
                toast.success('Export started');
              }}
              className={`flex w-full items-center justify-center gap-2 ${ui.btnSecondary} py-2.5`}
            >
              <Download className="h-4 w-4" />
              {!sidebarCollapsed && 'Export accounts'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-border bg-bg-card px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">{activeModule.label}</span>
                <span className="hidden text-text-muted md:inline">/</span>
                <h2 className="min-w-0 truncate text-base font-semibold text-text-primary">
                  {activeContext?.name || 'No active mission yet'}
                </h2>
                <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-bg-section border border-border text-text-secondary">
                  {activeWorkspace?.name || 'Default workspace'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SummaryChip label="Missions" value={summary.contexts} />
                <SummaryChip label="Accounts" value={summary.enrichedCompanies} />
                <SummaryChip label="Queue" value={summary.signaledCompanies} />
                <SummaryChip label="Playbooks" value={summary.playbooks} />
                {(activeContext?.target_industries || []).slice(0, 3).map((industry) => (
                  <span key={industry} className="rounded-full border border-border bg-bg-section px-3 py-1 text-xs font-medium text-text-secondary">
                    {industry}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => void loadSummary()}
                className={ui.btnSecondary}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${loadingSummary ? 'animate-spin' : ''}`} />
                  Refresh
                </span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className={ui.btnSecondary}
              >
                Settings
              </button>
            </div>
          </div>

          {activeScreen === 'gtm-context' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-bg-section px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Next</span>
              <span className="text-sm text-text-primary">{nextAction.title}</span>
              <span className="hidden text-sm text-text-muted xl:inline">•</span>
              <span className="text-sm text-text-secondary">{nextAction.body}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  onClick={() => navigateToScreen(nextAction.primary.screen)}
                  className={`inline-flex items-center gap-2 ${ui.btnPrimary}`}
                >
                  {nextAction.primary.label}
                  <ArrowRight className="h-4 w-4" />
                </button>

                {isActionLink(secondaryAction) ? (
                  <button
                    onClick={() => navigateToScreen(secondaryAction.screen)}
                    className={ui.btnSecondary}
                  >
                    {secondaryAction.label}
                  </button>
                ) : (
                  <button
                    onClick={() => secondaryAction.action()}
                    className={ui.btnSecondary}
                  >
                    {secondaryAction.label}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div key={`${workspaceVersion}:${activeScreen}`} className="min-h-0 flex-1 overflow-hidden">
          {activeScreen === 'gtm-context' && (
            <GTMIntelligence
              onICPGenerated={(id) => setSelectedIcpId(id)}
              preferredContextId={preferredGtmContextId}
            />
          )}
          {activeScreen === 'playbooks' && <PlaybookManager icpId={selectedIcpId} />}
          {activeScreen === 'enrichment' && <EnrichmentDashboard icpId={selectedIcpId} missionId={preferredGtmContextId} initialDomains={demoDomainsSeed} />}
          {activeScreen === 'signals' && <SignalQueue icpId={selectedIcpId} />}
          {activeScreen === 'leads' && (
            <div className="h-full overflow-auto p-6">
              <LeadTable icpId={selectedIcpId} />
            </div>
          )}
          {activeScreen === 'analytics' && <OutcomesDashboard />}
          {activeScreen === 'replies' && (
            <div className="flex h-full flex-col">
              <RepliesInbox />
            </div>
          )}
          {activeScreen === 'plays-messaging' && (
            <div className="flex h-full">
              <PlaysMessagingStudio />
            </div>
          )}
        </div>

        <AICopilot />
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl bg-bg-card border border-border rounded-2xl shadow-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={ui.label}>Workspace settings</p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">{activeWorkspace?.name || 'Workspace'}</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Configure Smartlead connectivity and the default cooldown behavior here.
                </p>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className={ui.btnSecondary}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Smartlead API key"
                value={settingsDraft.smartlead_api_key}
                onChange={(value) => setSettingsDraft((prev) => ({ ...prev, smartlead_api_key: value }))}
                placeholder="Paste key"
              />
              <Field
                label="Smartlead base URL"
                value={settingsDraft.smartlead_base_url}
                onChange={(value) => setSettingsDraft((prev) => ({ ...prev, smartlead_base_url: value }))}
                placeholder="https://server.smartlead.ai/api/v1"
              />
              <Field
                label="Cooldown contact threshold"
                value={settingsDraft.cooldown_contact_threshold}
                onChange={(value) => setSettingsDraft((prev) => ({ ...prev, cooldown_contact_threshold: value }))}
                placeholder="3"
                type="number"
              />
              <Field
                label="Cooldown months"
                value={settingsDraft.cooldown_months}
                onChange={(value) => setSettingsDraft((prev) => ({ ...prev, cooldown_months: value }))}
                placeholder="6"
                type="number"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => void handleSaveSettings()}
                disabled={savingSettings}
                className={ui.btnPrimary}
              >
                {savingSettings ? 'Saving…' : 'Save settings'}
              </button>

              <button
                onClick={() => void handleSeedWorkspace()}
                disabled={bootstrappingDemo || !workspaceId}
                className={ui.btnSecondary}
              >
                {bootstrappingDemo ? 'Loading sample data…' : 'Load sample workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-border bg-bg-section px-3 py-1 text-xs text-text-secondary">
      <span className="text-text-muted">{label}</span>{' '}
      <span className="font-semibold text-text-primary">{value}</span>
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'number';
}) {
  return (
    <label className="block">
      <span className={ui.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${ui.input} mt-2 py-3 px-4`}
      />
    </label>
  );
}
