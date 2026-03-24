'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  RefreshCw,
  Wand2,
  Mail,
  Copy,
  Check,
  X,
  Save,
  BookOpen,
} from 'lucide-react';
import api, {
  listMissionICPs,
  ICP,
  listAssets,
  SocialProofAsset,
  listMessagingPlays,
  createMessagingPlay,
  deleteMessagingPlay,
  getMessagingPlay,
  updateMessagingPlay,
  generateMessagingComponents,
  regenerateMessagingComponents,
  generateEmailVariants,
  updatePlayVariation,
  addPlayVariation,
  deletePlayVariation,
  MessagingPlay,
  PersonaData,
  PlayComponent,
  EmailVariant,
  listGTMContexts,
  GTMContextSummary,
} from '../services/api';
import { getErrorMessage } from '../lib/errors';
import { ui } from '../lib/ui';

const COMPONENT_ORDER = [
  'subject',
  'greeting',
  'opener',
  'problem',
  'value_prop',
  'story',
  'cta',
  'closer',
  'variables',
];

export function PlaysMessagingStudio() {
  const [missions, setMissions] = useState<GTMContextSummary[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [plays, setPlays] = useState<MessagingPlay[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<MessagingPlay | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingEmails, setGeneratingEmails] = useState(false);
  const [globalInstruction, setGlobalInstruction] = useState('');
  const [showNewPlayModal, setShowNewPlayModal] = useState(false);
  const [newPlayForm, setNewPlayForm] = useState({
    name: '',
    persona_id: '',
    icp_id: '',
  });
  const [personas, setPersonas] = useState<PersonaData[]>([]);
  const [icps, setIcps] = useState<ICP[]>([]);
  const [copiedVariantId, setCopiedVariantId] = useState<string | null>(null);
  const [editingPlayName, setEditingPlayName] = useState(false);
  const [editedPlayName, setEditedPlayName] = useState('');
  const [savingPlayName, setSavingPlayName] = useState(false);
  const [assets, setAssets] = useState<SocialProofAsset[]>([]);
  const [showAssetPanel, setShowAssetPanel] = useState(false);
  const [assetFilter, setAssetFilter] = useState<'all' | 'case_study' | 'testimonial' | 'metric'>('all');

  // Fetch missions on mount
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const { data } = await listGTMContexts();
        const contexts = data.contexts || [];
        setMissions(contexts);
        if (contexts.length > 0) {
          setSelectedMissionId(contexts[0].id);
        }
      } catch (error) {
        toast.error(`Failed to load missions: ${getErrorMessage(error, 'Unknown error')}`);
      }
    };
    fetchMissions();
  }, []);

  // Fetch social proof assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data } = await listAssets();
        setAssets(data.assets || []);
      } catch {
        // non-critical
      }
    };
    fetchAssets();
  }, []);

  // Fetch personas and ICPs when mission changes
  useEffect(() => {
    if (!selectedMissionId) return;

    const fetchMissionData = async () => {
      try {
        const [icpRes, missionRes] = await Promise.all([
          listMissionICPs(selectedMissionId),
          api.get(`/gtm/${selectedMissionId}`),
        ]);
        setIcps(icpRes.data.icps || []);
        setPersonas(missionRes.data.personas || []);
        setNewPlayForm((prev) => ({
          ...prev,
          persona_id: '',
          icp_id: '',
        }));
      } catch (error) {
        toast.error(
          `Failed to load mission data: ${getErrorMessage(error, 'Unknown error')}`
        );
      }
    };
    fetchMissionData();
  }, [selectedMissionId]);

  // Fetch plays when mission changes
  useEffect(() => {
    if (!selectedMissionId) return;

    const fetchPlays = async () => {
      try {
        setLoading(true);
        const { data } = await listMessagingPlays(selectedMissionId);
        const nextPlays = data.plays || [];
        setPlays(nextPlays);
        setSelectedPlay((current) => {
          if (!nextPlays.length) return null;
          if (!current) return nextPlays[0];
          return nextPlays.find((play) => play.id === current.id) || nextPlays[0];
        });
      } catch (error) {
        toast.error(`Failed to load plays: ${getErrorMessage(error, 'Unknown error')}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPlays();
  }, [selectedMissionId]);

  // Fetch full play detail when selected play changes
  const selectedPlayId = selectedPlay?.id ?? null;

  useEffect(() => {
    if (!selectedPlayId) return;

    const fetchPlayDetail = async () => {
      try {
        setLoading(true);
        const { data: detail } = await getMessagingPlay(selectedPlayId);
        setSelectedPlay(detail);
        setGlobalInstruction(detail.global_instruction || '');
        setEditingPlayName(false);
      } catch (error) {
        toast.error(`Failed to load play details: ${getErrorMessage(error, 'Unknown error')}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayDetail();
  }, [selectedPlayId]);

  const handleCreatePlay = async () => {
    if (!selectedMissionId || !newPlayForm.name || !newPlayForm.persona_id) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { data: newPlay } = await createMessagingPlay({
        mission_id: selectedMissionId,
        name: newPlayForm.name,
        persona_id: newPlayForm.persona_id,
        icp_id: newPlayForm.icp_id || undefined,
      });
      setPlays((prev) => [...prev, newPlay]);
      setSelectedPlay(newPlay);
      setShowNewPlayModal(false);
      setNewPlayForm({ name: '', persona_id: '', icp_id: '' });
      toast.success('Play created successfully');
    } catch (error) {
      toast.error(`Failed to create play: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleDeletePlay = async (playId: string) => {
    try {
      await deleteMessagingPlay(playId);
      setPlays((prev) => prev.filter((p) => p.id !== playId));
      if (selectedPlay?.id === playId) {
        setSelectedPlay(null);
      }
      toast.success('Play deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete play: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleRegenerateAll = async () => {
    if (!selectedPlay) return;

    try {
      setGenerating(true);
      await regenerateMessagingComponents(selectedPlay.id, globalInstruction);
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
      toast.success('Components regenerated successfully');
    } catch (error) {
      toast.error(`Failed to regenerate components: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMessaging = async () => {
    if (!selectedPlay) return;

    try {
      setGenerating(true);
      await generateMessagingComponents(
        selectedPlay.id,
        globalInstruction
      );
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
      toast.success('Messaging components generated successfully');
    } catch (error) {
      toast.error(
        `Failed to generate components: ${getErrorMessage(error, 'Unknown error')}`
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateEmails = async () => {
    if (!selectedPlay) return;

    try {
      setGeneratingEmails(true);
      await generateEmailVariants(selectedPlay.id);
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
      toast.success('Email variants generated successfully');
    } catch (error) {
      toast.error(`Failed to generate emails: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setGeneratingEmails(false);
    }
  };

  const handleUpdateVariation = async (
    componentId: string,
    variationIndex: number,
    newContent: string
  ) => {
    if (!selectedPlay) return;

    const component = selectedPlay.components?.find((c) => c.id === componentId);
    const variation = component?.variations[variationIndex];
    if (!variation) return;

    try {
      await updatePlayVariation(variation.id, { content: newContent });
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
    } catch (error) {
      toast.error(`Failed to update variation: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleAddVariation = async (componentId: string) => {
    if (!selectedPlay) return;

    try {
      await addPlayVariation({ component_id: componentId, content: '' });
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
    } catch (error) {
      toast.error(`Failed to add variation: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleDeleteVariation = async (
    componentId: string,
    variationIndex: number
  ) => {
    if (!selectedPlay) return;

    const component = selectedPlay.components?.find((c) => c.id === componentId);
    const variation = component?.variations[variationIndex];
    if (!variation) return;

    try {
      await deletePlayVariation(variation.id);
      const { data: updated } = await getMessagingPlay(selectedPlay.id);
      setSelectedPlay(updated);
    } catch (error) {
      toast.error(`Failed to delete variation: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const handleCopyVariant = async (variant: EmailVariant) => {
    const text = `Subject: ${variant.subject}\n\n${variant.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVariantId(variant.id);
      setTimeout(() => setCopiedVariantId(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSavePlayName = async () => {
    if (!selectedPlay || !editedPlayName.trim()) {
      setEditingPlayName(false);
      return;
    }

    try {
      setSavingPlayName(true);
      await updateMessagingPlay(selectedPlay.id, { name: editedPlayName });
      setPlays((prev) =>
        prev.map((p) =>
          p.id === selectedPlay.id ? { ...p, name: editedPlayName } : p
        )
      );
      setSelectedPlay((prev) =>
        prev ? { ...prev, name: editedPlayName } : null
      );
      setEditingPlayName(false);
      toast.success('Play name updated');
    } catch (error) {
      toast.error(`Failed to update play name: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setSavingPlayName(false);
    }
  };

  const getPersonaName = (personaId: string) => {
    const persona = personas.find((p) => p.id === personaId);
    return persona?.name || personaId;
  };

  const getICPName = (icpId: string | null) => {
    if (!icpId) return null;
    const icp = icps.find((i) => i.id === icpId);
    return icp?.name || icpId;
  };

  const componentCount = selectedPlay?.components?.length || 0;
  const componentMap: Record<string, PlayComponent> = {};
  if (selectedPlay?.components) {
    selectedPlay.components.forEach((comp) => {
      componentMap[comp.component_type] = comp;
    });
  }
  const filteredAssets = assets.filter((asset) => assetFilter === 'all' || asset.type === assetFilter);
  const selectedMissionName = missions.find((mission) => mission.id === selectedMissionId)?.name || 'Select mission';

  return (
    <div className="flex h-full min-w-0 flex-col bg-bg-card">
      <div className="border-b border-border bg-bg-card px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Messaging</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-text-primary">{selectedMissionName}</h2>
              <span className="rounded-full border border-border bg-bg-section px-3 py-1 text-xs font-medium text-text-secondary">
                {plays.length} play{plays.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div className="min-w-[220px] flex-1 md:max-w-xs">
            <select
              value={selectedMissionId || ''}
              onChange={(e) => setSelectedMissionId(e.target.value)}
              className={ui.select}
            >
              <option value="">Select mission</option>
              {missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNewPlayModal(true)}
            className={ui.btnPrimary}
          >
            <Plus size={16} />
            Create play
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <aside className="border-b border-border bg-bg-card xl:w-80 xl:shrink-0 xl:border-b-0 xl:border-r">
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Plays</p>
              <span className="text-xs text-text-muted">{plays.length} total</span>
            </div>

            <div className="max-h-[260px] space-y-2 overflow-y-auto xl:max-h-none xl:h-[calc(100vh-250px)]">
              {plays.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg-section px-4 py-6 text-center">
                  <Mail size={28} className="mx-auto mb-3 text-text-muted" />
                  <p className="text-sm text-text-secondary">No messaging plays yet.</p>
                  <p className="mt-1 text-xs text-text-muted">Create one and the workspace will generate anatomy and email drafts here.</p>
                </div>
              ) : (
                plays.map((play) => (
                  <div
                    key={play.id}
                    className={`group rounded-2xl border p-3 transition ${
                      selectedPlay?.id === play.id
                        ? 'border-brand-green/30 bg-brand-green/8'
                        : 'border-border bg-bg-section hover:border-border hover:bg-bg-section'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setSelectedPlay(play)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-text-primary">{play.name}</p>
                        <p className="mt-1 truncate text-xs text-text-muted">{getPersonaName(play.persona_id)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {play.icp_id && (
                            <span className="rounded-full bg-blue-500/16 px-2 py-1 text-[11px] font-medium text-blue-300">
                              {getICPName(play.icp_id)}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              play.status === 'active'
                                ? ui.badge.green
                                : play.status === 'archived'
                                  ? 'bg-amber-500/16 text-amber-300'
                                  : 'bg-bg-section text-text-secondary'
                            }`}
                          >
                            {play.status || 'draft'}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeletePlay(play.id);
                        }}
                        className={`rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100 ${ui.btnDanger}`}
                        title="Delete play"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto">
          {!selectedPlay ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-md rounded-3xl border border-border bg-bg-card px-8 py-10 text-center">
                <Mail size={36} className="mx-auto mb-4 text-text-muted" />
                <h3 className="text-lg font-semibold text-text-primary">Choose a play to edit</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Messaging stays focused here: select one play from the left or create a fresh one.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 md:p-5">
              <div className="rounded-3xl border border-border bg-bg-card p-4 md:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {editingPlayName ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editedPlayName}
                          onChange={(e) => setEditedPlayName(e.target.value)}
                          className={`min-w-[220px] flex-1 text-lg font-semibold ${ui.input}`}
                          autoFocus
                        />
                        <button
                          onClick={handleSavePlayName}
                          disabled={savingPlayName}
                          className={ui.btnPrimary + ' p-2'}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => setEditingPlayName(false)}
                          className={ui.btnSecondary + ' p-2'}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPlayName(true);
                          setEditedPlayName(selectedPlay.name);
                        }}
                        className="text-left"
                      >
                        <h3 className="text-xl font-semibold text-text-primary transition hover:text-brand-green">{selectedPlay.name}</h3>
                      </button>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={ui.chip.blue}>
                        {getPersonaName(selectedPlay.persona_id)}
                      </span>
                      {selectedPlay.icp_id && (
                        <span className="rounded-full bg-blue-500/16 px-3 py-1 text-xs font-medium text-blue-300">
                          {getICPName(selectedPlay.icp_id)}
                        </span>
                      )}
                      <span className={ui.chip.neutral}>
                        {componentCount} component{componentCount === 1 ? '' : 's'}
                      </span>
                      <span className={ui.chip.neutral}>
                        {selectedPlay.email_variants?.length || 0} email draft{selectedPlay.email_variants?.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {componentCount > 0 ? (
                      <button
                        onClick={handleRegenerateAll}
                        disabled={generating}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/16 disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
                        Refresh anatomy
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateMessaging}
                        disabled={generating}
                        className={ui.btnPrimary + ' disabled:opacity-50'}
                      >
                        <Wand2 size={16} />
                        Generate anatomy
                      </button>
                    )}

                    <button
                      onClick={handleGenerateEmails}
                      disabled={generatingEmails || componentCount === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/16 disabled:opacity-50"
                    >
                      <Mail size={16} />
                      Draft emails
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className={`mb-2 block ${ui.label}`}>
                    AI guidance
                  </label>
                  <input
                    type="text"
                    value={globalInstruction}
                    onChange={(e) => setGlobalInstruction(e.target.value)}
                    placeholder="Optional note for tone, angle, objections, or proof to emphasize"
                    className={ui.input}
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-28 rounded-3xl bg-bg-section/70 animate-pulse" />
                  ))}
                </div>
              ) : componentCount === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-bg-card px-6 py-10 text-center">
                  <Wand2 size={36} className="mx-auto mb-4 text-text-muted" />
                  <h3 className="text-lg font-semibold text-text-primary">No messaging anatomy yet</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                    Generate the core components first. Once those exist, this view stays compact and lets you refine each variation inline.
                  </p>
                </div>
              ) : (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Message anatomy</h3>
                      <p className="text-sm text-text-muted">Each component stays editable without forcing a wide table layout.</p>
                    </div>
                  </div>

                  {COMPONENT_ORDER.map((componentType) => {
                    const component = componentMap[componentType];
                    if (!component) return null;

                    return (
                      <div key={componentType} className="rounded-3xl border border-border bg-bg-card p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className={`text-[11px] ${ui.label}`}>
                              {componentType.replace(/_/g, ' ')}
                            </p>
                            <p className="mt-1 text-sm text-text-secondary">
                              {component.variations?.length || 0} variation{component.variations?.length === 1 ? '' : 's'}
                            </p>
                          </div>

                          <button
                            onClick={() => handleAddVariation(component.id)}
                            className={ui.btnGhost}
                          >
                            <Plus size={14} />
                            Add variation
                          </button>
                        </div>

                        {component.variations?.length ? (
                          <div className="grid gap-3 2xl:grid-cols-2">
                            {component.variations.map((variation, variationIndex) => (
                              <div key={variation.id} className="group relative rounded-2xl border border-border bg-bg-section p-3">
                                <span className="mb-2 inline-flex rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-text-muted">
                                  Variation {variationIndex + 1}
                                </span>
                                <textarea
                                  defaultValue={variation.content}
                                  onBlur={(e) => {
                                    if (e.currentTarget.value !== variation.content) {
                                      void handleUpdateVariation(component.id, variationIndex, e.currentTarget.value);
                                    }
                                  }}
                                  className={`min-h-[112px] w-full resize-y ${ui.textarea}`}
                                />
                                <button
                                  onClick={() => void handleDeleteVariation(component.id, variationIndex)}
                                  className={`absolute right-3 top-3 rounded-lg p-1.5 opacity-0 transition group-hover:opacity-100 ${ui.btnDanger}`}
                                  title="Delete variation"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-bg-section px-4 py-6 text-sm text-text-muted">
                            No variations yet. Add one to start shaping this component.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              <div className="rounded-3xl border border-border bg-bg-card overflow-hidden">
                <button
                  onClick={() => setShowAssetPanel(!showAssetPanel)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-bg-section"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-violet-300" />
                    <span className="text-sm font-semibold text-text-primary">Social proof</span>
                    <span className="rounded-full bg-violet-500/12 px-2 py-1 text-[11px] font-medium text-violet-300">
                      {assets.length}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">{showAssetPanel ? 'Hide references' : 'Show references'}</span>
                </button>

                {showAssetPanel && (
                  <div className="border-t border-border p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(['all', 'case_study', 'testimonial', 'metric'] as const).map((filterValue) => (
                        <button
                          key={filterValue}
                          onClick={() => setAssetFilter(filterValue)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            assetFilter === filterValue
                              ? 'bg-violet-500/18 text-violet-300'
                              : 'bg-bg-section text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {filterValue === 'all'
                            ? 'All'
                            : filterValue.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                        </button>
                      ))}
                    </div>

                    {filteredAssets.length === 0 ? (
                      <p className="text-sm text-text-muted">
                        No reference assets in this filter yet. Add them in Mission so the generator can ground copy in real proof.
                      </p>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {filteredAssets.map((asset) => (
                          <div key={asset.id} className="rounded-2xl border border-border bg-bg-section p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                asset.type === 'case_study'
                                  ? 'bg-blue-500/16 text-blue-300'
                                  : asset.type === 'testimonial'
                                    ? 'bg-emerald-500/16 text-emerald-300'
                                    : 'bg-amber-500/16 text-amber-300'
                              }`}>
                                {asset.type.replace('_', ' ')}
                              </span>
                              <p className="text-sm font-semibold text-text-primary">{asset.title}</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{asset.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedPlay.email_variants && selectedPlay.email_variants.length > 0 && (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">Ready-to-send drafts</h3>
                      <p className="text-sm text-text-muted">Copy a finished draft once the anatomy looks right.</p>
                    </div>
                    <span className="rounded-full border border-border bg-bg-section px-3 py-1 text-xs font-medium text-text-secondary">
                      {selectedPlay.email_variants.length} variants
                    </span>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {selectedPlay.email_variants.map((variant) => (
                      <div key={variant.id} className="rounded-3xl border border-border bg-bg-card p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <span className="rounded-full bg-blue-500/16 px-2.5 py-1 text-xs font-semibold text-blue-300">
                            {variant.style_label}
                          </span>
                          <button
                            onClick={() => handleCopyVariant(variant)}
                            className="rounded-xl p-2 text-brand-green transition hover:bg-bg-section"
                            title="Copy email"
                          >
                            {copiedVariantId === variant.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-text-primary">{variant.subject}</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{variant.body}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>

      {/* New Play Modal */}
      {showNewPlayModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Create New Play
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Play Name
                </label>
                <input
                  type="text"
                  value={newPlayForm.name}
                  onChange={(e) =>
                    setNewPlayForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter play name"
                  className={`w-full ${ui.input}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Mission
                </label>
                <select
                  value={selectedMissionId || ''}
                  onChange={(e) => {
                    setSelectedMissionId(e.target.value);
                    setNewPlayForm((prev) => ({
                      ...prev,
                      persona_id: '',
                      icp_id: '',
                    }));
                  }}
                  className={`w-full ${ui.select}`}
                >
                  <option value="">Select a mission</option>
                  {missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Persona
                </label>
                <select
                  value={newPlayForm.persona_id}
                  onChange={(e) =>
                    setNewPlayForm((prev) => ({
                      ...prev,
                      persona_id: e.target.value,
                    }))
                  }
                  className={`w-full ${ui.select}`}
                >
                  <option value="">Select a persona</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  ICP (Optional)
                </label>
                <select
                  value={newPlayForm.icp_id}
                  onChange={(e) =>
                    setNewPlayForm((prev) => ({
                      ...prev,
                      icp_id: e.target.value,
                    }))
                  }
                  className={`w-full ${ui.select}`}
                >
                  <option value="">Select an ICP (optional)</option>
                  {icps.map((icp) => (
                    <option key={icp.id} value={icp.id}>
                      {icp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewPlayModal(false);
                  setNewPlayForm({ name: '', persona_id: '', icp_id: '' });
                }}
                className={`flex-1 ${ui.btnSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlay}
                className={`flex-1 ${ui.btnPrimary}`}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
