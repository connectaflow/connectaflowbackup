"use client";

import { useState } from 'react';
import { FlaskRound, MessageSquare, Pencil, Trash2, Copy, X, Check } from 'lucide-react';
import type {
    BuyingTriggerData,
    GTMContextDetail,
    GTMPlayData,
    ICP,
    PersonaData,
    SignalDefinitionData,
} from '../../services/api';
import api, { createPersona, updatePersona, createBuyingTrigger, createSignalDef } from '../../services/api';
import { ui, type ChipVariant } from '../../lib/ui';

const fromLines = (s: string) => s.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);

export function Chip({ text, variant = 'neutral' }: { text: string; variant?: ChipVariant }) {
    return <span className={ui.chip[variant]}>{text}</span>;
}

function TokenGroup({ items, variant = 'neutral' }: { items: string[]; variant?: ChipVariant }) {
    if (!items.length) return <span className="text-sm text-text-muted">—</span>;
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <Chip key={item} text={item} variant={variant} />
            ))}
        </div>
    );
}

export function Overview({ detail }: { detail: GTMContextDetail }) {
    const info = [
        { label: 'Core Problem', value: detail.core_problem },
        { label: 'Product Category', value: detail.product_category },
        { label: 'Value Proposition', value: detail.value_proposition },
        { label: 'Why Customers Buy', value: detail.why_customers_buy },
        { label: 'Why Customers Churn', value: detail.why_customers_churn },
        { label: 'Decision Process', value: detail.decision_process },
        { label: 'Common Objections', value: detail.common_objections?.join(', ') },
        { label: 'Key Integrations', value: detail.key_integrations?.join(', ') },
        { label: 'Geographic Focus', value: detail.geographic_focus },
        { label: 'Competitors', value: detail.competitors?.join(', ') },
        { label: 'Sales Cycle', value: detail.sales_cycle_days },
        { label: 'Avg Deal Size', value: detail.avg_deal_size },
        { label: 'Market Maturity', value: detail.market_maturity },
    ];

    return (
        <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
                {info.map((item) => (
                    <div key={item.label} className={`p-3 ${ui.subCard}`}>
                        <p className={ui.label}>{item.label}</p>
                        <p className={`mt-1 ${ui.value}`}>{item.value || '—'}</p>
                    </div>
                ))}
            </div>
            <div className={`${ui.subCard} p-4`}>
                <p className={`${ui.label} mb-2`}>Customer Examples</p>
                <div className="flex flex-wrap gap-2">
                    {detail.customer_examples?.length
                        ? detail.customer_examples.map((customer) => <Chip key={customer} text={customer} variant="neutral" />)
                        : '—'}
                </div>
            </div>
        </div>
    );
}

export function Personas({ personas, missionId, icpId, icpName, icps, onReload }: {
    personas: PersonaData[];
    missionId?: string;
    icpId?: string | null;
    icpName?: string;
    icps?: ICP[];
    onReload?: () => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [pForm, setPForm] = useState({
        selectedIcpId: '', name: '', buying_style: '', internal_politics: '',
        day_in_life: '', success_looks_like: '', nightmare_scenario: '',
        job_titles: '', kpis: '', pain_points: '', information_diet: '',
        objections: '', trigger_phrases: '', evaluation_criteria: '',
        messaging_do: '', messaging_dont: '',
    });
    const [pSaving, setPSaving] = useState(false);
    const [editingPersona, setEditingPersona] = useState<PersonaData | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const toLines = (arr?: string[]) => (arr || []).join('\n');

    const openEdit = (persona: PersonaData) => {
        setDraft({
            name: persona.name || '',
            buying_style: persona.buying_style || '',
            internal_politics: persona.internal_politics || '',
            day_in_life: persona.day_in_life || '',
            success_looks_like: persona.success_looks_like || '',
            nightmare_scenario: persona.nightmare_scenario || '',
            job_titles: toLines(persona.job_titles),
            kpis: toLines(persona.kpis),
            pain_points: toLines(persona.pain_points),
            information_diet: toLines(persona.information_diet),
            objections: toLines(persona.objections),
            trigger_phrases: toLines(persona.trigger_phrases),
            evaluation_criteria: toLines(persona.evaluation_criteria),
            messaging_do: toLines(persona.messaging_do),
            messaging_dont: toLines(persona.messaging_dont),
        });
        setEditingPersona(persona);
    };

    const handleSave = async () => {
        if (!editingPersona) return;
        setSaving(true);
        try {
            await updatePersona(editingPersona.id, {
                name: draft.name,
                buying_style: draft.buying_style,
                internal_politics: draft.internal_politics,
                day_in_life: draft.day_in_life,
                success_looks_like: draft.success_looks_like,
                nightmare_scenario: draft.nightmare_scenario,
                job_titles: fromLines(draft.job_titles),
                kpis: fromLines(draft.kpis),
                pain_points: fromLines(draft.pain_points),
                information_diet: fromLines(draft.information_diet),
                objections: fromLines(draft.objections),
                trigger_phrases: fromLines(draft.trigger_phrases),
                evaluation_criteria: fromLines(draft.evaluation_criteria),
                messaging_do: fromLines(draft.messaging_do),
                messaging_dont: fromLines(draft.messaging_dont),
            });
            setEditingPersona(null);
            onReload?.();
        } catch {
            // silently fail
        } finally {
            setSaving(false);
        }
    };

    const getDefaultIcp = () => (icps?.length === 1 ? (icps[0]?.id ?? '') : '');

    const openCreateForm = () => {
        setPForm({ selectedIcpId: getDefaultIcp(), name: '', buying_style: '', internal_politics: '',
            day_in_life: '', success_looks_like: '', nightmare_scenario: '', job_titles: '',
            kpis: '', pain_points: '', information_diet: '', objections: '', trigger_phrases: '',
            evaluation_criteria: '', messaging_do: '', messaging_dont: '' });
        setIsCreating(true);
    };

    const handlePersonaCreate = async () => {
        if (!missionId || !pForm.name.trim() || !pForm.selectedIcpId) return;
        setPSaving(true);
        try {
            await createPersona(missionId, {
                name: pForm.name.trim(),
                icp_id: pForm.selectedIcpId,
                buying_style: pForm.buying_style,
                internal_politics: pForm.internal_politics,
                day_in_life: pForm.day_in_life,
                success_looks_like: pForm.success_looks_like,
                nightmare_scenario: pForm.nightmare_scenario,
                job_titles: fromLines(pForm.job_titles),
                kpis: fromLines(pForm.kpis),
                pain_points: fromLines(pForm.pain_points),
                information_diet: fromLines(pForm.information_diet),
                objections: fromLines(pForm.objections),
                trigger_phrases: fromLines(pForm.trigger_phrases),
                evaluation_criteria: fromLines(pForm.evaluation_criteria),
                messaging_do: fromLines(pForm.messaging_do),
                messaging_dont: fromLines(pForm.messaging_dont),
            });
            setIsCreating(false);
            onReload?.();
        } catch {
            // silently fail
        } finally {
            setPSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!missionId) return;
        setDeletingId(id);
        try {
            await api.delete(`/gtm/personas/${id}`);
            onReload?.();
        } catch {
            // silently fail
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Personas ({personas.length})</p>
            {missionId && (
                <button
                    onClick={() => { if (isCreating) { setIsCreating(false); } else { openCreateForm(); } }}
                    className={ui.btnGhost}
                >
                    {isCreating ? 'Cancel' : '+ New Persona'}
                </button>
            )}
        </div>
        {isCreating && (
            <div className="mt-3 rounded-2xl border border-brand-green/20 bg-bg-section p-4 space-y-3">
                <p className="text-xs font-semibold text-brand-green">New Persona</p>
                <div>
                    <label className={`block ${ui.label} mb-1`}>ICP *</label>
                    <select
                        value={pForm.selectedIcpId}
                        onChange={e => setPForm(f => ({ ...f, selectedIcpId: e.target.value }))}
                        className={ui.select}
                    >
                        <option value="">Select ICP…</option>
                        {(icps || []).map(icp => <option key={icp.id} value={icp.id}>{icp.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={`block ${ui.label} mb-1`}>Name *</label>
                    <input value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. VP of Sales"
                        className={ui.input} />
                </div>
                {([
                    ['buying_style', 'Buying Style'],
                    ['internal_politics', 'Internal Politics'],
                    ['day_in_life', 'Day in Life'],
                    ['success_looks_like', 'Success Looks Like'],
                    ['nightmare_scenario', 'Nightmare Scenario'],
                ] as [string, string][]).map(([key, label]) => (
                    <div key={key}>
                        <label className={`block ${ui.label} mb-1`}>{label}</label>
                        <input value={(pForm as Record<string, string>)[key]}
                            onChange={e => setPForm(f => ({ ...f, [key]: e.target.value }))}
                            className={ui.input} />
                    </div>
                ))}
                {([
                    ['job_titles', 'Job Titles'],
                    ['kpis', 'KPIs'],
                    ['pain_points', 'Pain Points'],
                    ['information_diet', 'Information Diet'],
                    ['objections', 'Objections'],
                    ['trigger_phrases', 'Trigger Phrases'],
                    ['evaluation_criteria', 'Evaluation Criteria'],
                    ['messaging_do', 'Messaging Do'],
                    ['messaging_dont', "Messaging Don't"],
                ] as [string, string][]).map(([key, label]) => (
                    <div key={key}>
                        <label className={`block ${ui.label} mb-1`}>
                            {label} <span className="normal-case font-normal text-text-muted">(one per line)</span>
                        </label>
                        <textarea value={(pForm as Record<string, string>)[key]}
                            onChange={e => setPForm(f => ({ ...f, [key]: e.target.value }))}
                            rows={3}
                            className={ui.textarea} />
                    </div>
                ))}
                <div className="flex gap-2 pt-1">
                    <button
                        onClick={() => void handlePersonaCreate()}
                        disabled={pSaving || !pForm.name.trim() || !pForm.selectedIcpId}
                        className={ui.btnPrimary}
                    >
                        {pSaving ? '…' : 'Create'}
                    </button>
                    <button onClick={() => setIsCreating(false)} className={ui.btnSecondary}>
                        Cancel
                    </button>
                </div>
            </div>
        )}
        {personas.length === 0
            ? <EmptyState text="No personas yet. Generate strategy or add one above." />
            : <div className="grid md:grid-cols-2 gap-4">
            {personas.map((persona) => (
                <div key={persona.id} onClick={() => openEdit(persona)} className="cursor-pointer p-4 rounded-xl bg-bg-card border border-border space-y-2 hover:border-brand-green/40 transition-colors">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">{persona.name}</p>
                            <p className="text-xs text-text-muted">{persona.department} • {persona.seniority}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Chip text={persona.decision_role || 'Role'} variant="blue" />
                            {missionId && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); void handleDelete(persona.id); }}
                                    disabled={deletingId === persona.id}
                                    className={`ml-1 ${ui.btnDanger} disabled:opacity-40`}
                                    title="Delete persona"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <Field label="Titles" value={persona.job_titles?.join(', ')} />
                    <Field label="KPIs" value={persona.kpis?.join(', ')} />
                    <Field label="Pain Points" value={persona.pain_points?.join('; ')} />
                    <Field label="Buying Style" value={persona.buying_style} />
                    <Field label="Information Diet" value={persona.information_diet?.join(', ')} />
                    <Field label="Objections" value={persona.objections?.join('; ')} />
                    <Field label="Internal Politics" value={persona.internal_politics} />
                    <Field label="Trigger Phrases" value={persona.trigger_phrases?.join('; ')} />
                    <Field label="Day in Life" value={persona.day_in_life} />
                    <Field label="Success Looks Like" value={persona.success_looks_like} />
                    <Field label="Nightmare Scenario" value={persona.nightmare_scenario} />
                    <Field label="Evaluation Criteria" value={persona.evaluation_criteria?.join(', ')} />
                    <Field label="Messaging Do" value={persona.messaging_do?.join('; ')} />
                    <Field label="Messaging Don't" value={persona.messaging_dont?.join('; ')} />
                </div>
            ))}
            </div>
        }
        {editingPersona && (
            <div className={ui.modal.overlay} onClick={() => setEditingPersona(null)}>
                <div className={ui.modal.panel} onClick={e => e.stopPropagation()}>
                    <div className={ui.modal.header}>
                        <p className="text-sm font-semibold text-text-primary">Edit Persona</p>
                        <button onClick={() => setEditingPersona(null)} className="text-text-muted hover:text-text-primary transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
                        <div>
                            <p className={`${ui.label} mb-1`}>ICP (read-only)</p>
                            <p className="text-sm text-text-secondary">{icpName || editingPersona.icp_id?.slice(0, 8) || '—'}</p>
                        </div>
                        {([
                            ['name', 'Name'],
                            ['buying_style', 'Buying Style'],
                            ['internal_politics', 'Internal Politics'],
                            ['day_in_life', 'Day in Life'],
                            ['success_looks_like', 'Success Looks Like'],
                            ['nightmare_scenario', 'Nightmare Scenario'],
                        ] as [string, string][]).map(([key, label]) => (
                            <div key={key}>
                                <p className={`${ui.label} mb-1`}>{label}</p>
                                <input
                                    value={draft[key] ?? ''}
                                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                                    className={ui.input}
                                />
                            </div>
                        ))}
                        {([
                            ['job_titles', 'Job Titles'],
                            ['kpis', 'KPIs'],
                            ['pain_points', 'Pain Points'],
                            ['information_diet', 'Information Diet'],
                            ['objections', 'Objections'],
                            ['trigger_phrases', 'Trigger Phrases'],
                            ['evaluation_criteria', 'Evaluation Criteria'],
                            ['messaging_do', 'Messaging Do'],
                            ['messaging_dont', "Messaging Don't"],
                        ] as [string, string][]).map(([key, label]) => (
                            <div key={key}>
                                <p className={`${ui.label} mb-1`}>{label} <span className="normal-case font-normal text-text-muted">(one per line)</span></p>
                                <textarea
                                    value={draft[key] ?? ''}
                                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                                    rows={3}
                                    className={ui.textarea}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={ui.modal.footer}>
                        <button onClick={() => setEditingPersona(null)} className={ui.btnSecondary}>
                            Cancel
                        </button>
                        <button onClick={() => void handleSave()} disabled={saving} className={`${ui.btnPrimary} disabled:opacity-40`}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}

const EMPTY_TRIGGER_FORM = { name: '', category: '', description: '', why_it_matters: '', ideal_timing: '', qualifying_questions: '' };

export function Triggers({ triggers, missionId, onReload }: {
    triggers: BuyingTriggerData[];
    missionId?: string;
    onReload?: () => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [tForm, setTForm] = useState({ ...EMPTY_TRIGGER_FORM });
    const [tSaving, setTSaving] = useState(false);

    const handleDelete = async (id: string) => {
        if (!missionId) return;
        setDeletingId(id);
        try {
            await api.delete(`/gtm/triggers/${id}`);
            onReload?.();
        } catch {} finally { setDeletingId(null); }
    };

    const openCreateForm = () => {
        setTForm({ ...EMPTY_TRIGGER_FORM });
        setIsCreating(true);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setTForm({ ...EMPTY_TRIGGER_FORM });
    };

    const handleTriggerCreate = async () => {
        if (!missionId || !tForm.name.trim()) return;
        setTSaving(true);
        try {
            await createBuyingTrigger(missionId, {
                name: tForm.name.trim(),
                category: tForm.category,
                description: tForm.description,
                why_it_matters: tForm.why_it_matters,
                ideal_timing: tForm.ideal_timing,
                qualifying_questions: fromLines(tForm.qualifying_questions),
            });
            setIsCreating(false);
            setTForm({ ...EMPTY_TRIGGER_FORM });
            onReload?.();
        } catch {
        } finally {
            setTSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Triggers ({triggers.length})</p>
                {missionId && (
                    <button
                        onClick={() => { if (isCreating) { handleCancel(); } else { openCreateForm(); } }}
                        className={ui.btnGhost}
                    >
                        {isCreating ? 'Cancel' : '+ New Trigger'}
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="mt-3 rounded-2xl border border-brand-green/20 bg-bg-section p-4 space-y-3">
                    <p className="text-xs font-semibold text-brand-green">New Trigger</p>
                    <div>
                        <label className={`block ${ui.label} mb-1`}>Name *</label>
                        <input value={tForm.name} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Series B Funding"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && tForm.name.trim() && !tSaving) { e.preventDefault(); void handleTriggerCreate(); } else if (e.key === 'Escape') { e.preventDefault(); handleCancel(); } }}
                            className={ui.input} />
                    </div>
                    {([
                        ['category', 'Category'],
                        ['description', 'Description'],
                        ['why_it_matters', 'Why It Matters'],
                        ['ideal_timing', 'Ideal Timing'],
                    ] as [string, string][]).map(([key, label]) => (
                        <div key={key}>
                            <label className={`block ${ui.label} mb-1`}>{label}</label>
                            <input value={(tForm as Record<string, string>)[key]}
                                onChange={e => setTForm(f => ({ ...f, [key]: e.target.value }))}
                                className={ui.input} />
                        </div>
                    ))}
                    <div>
                        <label className={`block ${ui.label} mb-1`}>
                            Qualifying Questions <span className="normal-case font-normal text-text-muted">(one per line)</span>
                        </label>
                        <textarea value={tForm.qualifying_questions}
                            onChange={e => setTForm(f => ({ ...f, qualifying_questions: e.target.value }))}
                            rows={3}
                            className={ui.textarea} />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => void handleTriggerCreate()}
                            disabled={tSaving || !tForm.name.trim()}
                            className={ui.btnPrimary}
                        >
                            {tSaving ? '…' : 'Create'}
                        </button>
                        <button onClick={handleCancel} className={ui.btnSecondary}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {triggers.length === 0 && !isCreating && <EmptyState text="No triggers yet." />}

            <div className="grid md:grid-cols-2 gap-4">
                {triggers.map((trigger) => (
                    <div key={trigger.id} className="p-4 rounded-xl bg-bg-card border border-border space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-text-primary">{trigger.name}</p>
                                <p className="text-xs text-text-muted">{trigger.category || 'uncategorized'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Chip text={trigger.urgency_level || 'timing'} variant="amber" />
                                {missionId && (
                                    <button
                                        onClick={() => void handleDelete(trigger.id)}
                                        disabled={deletingId === trigger.id}
                                        className={`ml-1 ${ui.btnDanger} disabled:opacity-40`}
                                        title="Delete trigger"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Field label="Description" value={trigger.description} />
                        <Field label="Why it matters" value={trigger.why_it_matters} />
                        <Field label="Ideal timing" value={trigger.ideal_timing} />
                        <Field label="Qualifying questions" value={trigger.qualifying_questions?.join('; ')} />
                    </div>
                ))}
            </div>
        </div>
    );
}

const EMPTY_SIGNAL_FORM = { name: '', description: '', keywords: '', false_positives: '', fields_used: '' };

export function Signals({ signals, missionId, onReload }: {
    signals: SignalDefinitionData[];
    missionId?: string;
    onReload?: () => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [sForm, setSForm] = useState({ ...EMPTY_SIGNAL_FORM });
    const [sSaving, setSSaving] = useState(false);

    const handleDelete = async (id: string) => {
        if (!missionId) return;
        setDeletingId(id);
        try {
            await api.delete(`/gtm/signals/${id}`);
            onReload?.();
        } catch {} finally { setDeletingId(null); }
    };

    const openCreateForm = () => {
        setSForm({ ...EMPTY_SIGNAL_FORM });
        setIsCreating(true);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSForm({ ...EMPTY_SIGNAL_FORM });
    };

    const handleSignalCreate = async () => {
        if (!missionId || !sForm.name.trim()) return;
        setSSaving(true);
        try {
            await createSignalDef(missionId, {
                name: sForm.name.trim(),
                description: sForm.description,
                keywords: fromLines(sForm.keywords),
                false_positive_notes: sForm.false_positives,
                enrichment_fields_used: fromLines(sForm.fields_used),
            });
            setIsCreating(false);
            setSForm({ ...EMPTY_SIGNAL_FORM });
            onReload?.();
        } catch {
        } finally {
            setSSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Signals ({signals.length})</p>
                {missionId && (
                    <button
                        onClick={() => { if (isCreating) { handleCancel(); } else { openCreateForm(); } }}
                        className={ui.btnGhost}
                    >
                        {isCreating ? 'Cancel' : '+ New Signal'}
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="mt-3 rounded-2xl border border-brand-green/20 bg-bg-section p-4 space-y-3">
                    <p className="text-xs font-semibold text-brand-green">New Signal</p>
                    <div>
                        <label className={`block ${ui.label} mb-1`}>Name *</label>
                        <input value={sForm.name} onChange={e => setSForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. VP Sales Hiring"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && sForm.name.trim() && !sSaving) { e.preventDefault(); void handleSignalCreate(); } else if (e.key === 'Escape') { e.preventDefault(); handleCancel(); } }}
                            className={ui.input} />
                    </div>
                    <div>
                        <label className={`block ${ui.label} mb-1`}>Description</label>
                        <input value={sForm.description} onChange={e => setSForm(f => ({ ...f, description: e.target.value }))}
                            className={ui.input} />
                    </div>
                    {([
                        ['keywords', 'Keywords'],
                        ['false_positives', 'False Positives'],
                        ['fields_used', 'Fields Used'],
                    ] as [string, string][]).map(([key, label]) => (
                        <div key={key}>
                            <label className={`block ${ui.label} mb-1`}>
                                {label} <span className="normal-case font-normal text-text-muted">(one per line)</span>
                            </label>
                            <textarea value={(sForm as Record<string, string>)[key]}
                                onChange={e => setSForm(f => ({ ...f, [key]: e.target.value }))}
                                rows={3}
                                className={ui.textarea} />
                        </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => void handleSignalCreate()}
                            disabled={sSaving || !sForm.name.trim()}
                            className={ui.btnPrimary}
                        >
                            {sSaving ? '…' : 'Create'}
                        </button>
                        <button onClick={handleCancel} className={ui.btnSecondary}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {signals.length === 0 && !isCreating && <EmptyState text="No signal definitions yet." />}

            <div className="grid md:grid-cols-2 gap-4">
                {signals.map((signal) => (
                    <div key={signal.id} className="min-w-0 p-4 rounded-xl bg-bg-card border border-border space-y-4 overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-text-primary">{signal.name}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {signal.source?.split('|').map((item) => item.trim()).filter(Boolean).map((item) => (
                                        <Chip key={`src-${item}`} text={item} variant="neutral" />
                                    ))}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {signal.detection_method?.split('|').map((item) => item.trim()).filter(Boolean).map((item) => (
                                        <Chip key={`det-${item}`} text={item} variant="neutral" />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <Chip text={`Strength ${Math.round((signal.strength_score || 0) * 100)}%`} variant="blue" />
                                {missionId && (
                                    <button
                                        onClick={() => void handleDelete(signal.id)}
                                        disabled={deletingId === signal.id}
                                        className={`ml-1 ${ui.btnDanger} disabled:opacity-40`}
                                        title="Delete signal"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <Field label="Description" value={signal.description} />
                        <div>
                            <p className={ui.label}>Keywords</p>
                            <div className="mt-2">
                                <TokenGroup items={signal.keywords || []} variant="blue" />
                            </div>
                        </div>
                        <Field label="False positives" value={signal.false_positive_notes} />
                        <div>
                            <p className={ui.label}>Fields used</p>
                            <div className="mt-2">
                                <TokenGroup items={signal.enrichment_fields_used || []} variant="green" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Plays({ plays, missionId, onReload }: {
    plays: GTMPlayData[];
    missionId?: string;
    onReload?: () => void;
}) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!missionId) return;
        setDeletingId(id);
        try {
            await api.delete(`/gtm/plays/${id}`);
            onReload?.();
        } catch {} finally { setDeletingId(null); }
    };

    if (!plays.length) return <EmptyState text="No plays yet." />;
    return (
        <div className="space-y-4">
            {plays.map((play) => (
                <div key={play.id} className="p-4 rounded-xl bg-bg-card border border-border space-y-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-text-primary">{play.name}</p>
                            <p className="text-xs text-text-muted">{play.icp_statement}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Chip text={play.status || 'draft'} variant="green" />
                            {missionId && (
                                <button
                                    onClick={() => void handleDelete(play.id)}
                                    disabled={deletingId === play.id}
                                    className={`ml-1 ${ui.btnDanger} disabled:opacity-40`}
                                    title="Delete play"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <Field label="Trigger / Signal / Persona" value={[play.trigger_id, play.signal_id, play.persona_id].filter(Boolean).join(' • ') || '—'} />
                    <Field label="Messaging angle" value={play.messaging_angle} />
                    <Field label="Channel sequence" value={play.channel_sequence?.join(' → ')} />
                    <Field label="Timing rationale" value={play.timing_rationale} />
                    <Field label="Opening hook" value={play.opening_hook} />
                    <Field label="Objection handling" value={formatObjections(play.objection_handling)} />
                    <Field label="Competitive positioning" value={play.competitive_positioning} />
                    <Field label="Success criteria" value={play.success_criteria} />
                    <Field label="Email subject lines" value={play.email_subject_lines?.join(' | ')} />
                    <Field label="Call talk track" value={play.call_talk_track} />
                </div>
            ))}
        </div>
    );
}

export function Enrichment({ patterns }: { patterns: Record<string, unknown> | null }) {
    if (!patterns) return <EmptyState text="No enrichment feedback yet. Run Refine from Enrichment." />;
    return (
        <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(patterns).map(([key, value]) => (
                <div key={key} className="min-w-0 p-4 rounded-xl bg-bg-card border border-border space-y-2 overflow-hidden">
                    <div className="flex items-center gap-2 text-text-secondary">
                        <FlaskRound className="w-4 h-4 text-brand-green" />
                        <p className="text-sm font-semibold capitalize">{key.replace('_', ' ')}</p>
                    </div>
                    <pre className="overflow-x-auto text-xs text-text-secondary whitespace-pre-wrap break-words leading-relaxed">{JSON.stringify(value, null, 2)}</pre>
                </div>
            ))}
        </div>
    );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="min-w-0">
            <p className={ui.label}>{label}</p>
            <p className={`mt-1 ${ui.value}`}>{value || '—'}</p>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 text-text-muted text-sm">
            <MessageSquare className="w-4 h-4" />
            <span>{text}</span>
        </div>
    );
}

function formatObjections(objections?: Record<string, string>) {
    if (!objections) return '—';
    return Object.entries(objections).map(([key, value]) => `${key}: ${value}`).join(' | ');
}
