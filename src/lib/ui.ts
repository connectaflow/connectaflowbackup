import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cx(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const inputBase =
    'w-full bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-border-focus focus:ring-1 focus:ring-brand-green/20 transition-all';

export const ui = {
    // Surfaces
    card: 'bg-bg-card border border-border rounded-2xl',
    subCard: 'bg-bg-card border border-border rounded-xl',
    section: 'bg-bg-section border border-border rounded-2xl',
    statCard: 'p-3 rounded-xl bg-bg-section border border-border',
    divider: 'border-t border-border',

    // Typography
    label: 'text-[11px] uppercase text-text-muted font-semibold tracking-wider',
    value: 'text-sm text-text-primary leading-relaxed break-words whitespace-pre-wrap',

    // Form controls
    input: inputBase,
    textarea: `${inputBase} resize-none`,
    select: inputBase,

    // Buttons
    btnPrimary:
        'rounded-xl bg-brand-green text-white font-semibold px-4 py-2 text-sm hover:bg-brand-green/90 disabled:opacity-50 transition-colors',
    btnSecondary:
        'rounded-xl border border-border text-text-secondary px-4 py-2 text-sm hover:border-brand-blue/60 hover:text-text-primary transition-colors',
    btnGhost:
        'rounded-xl text-text-secondary px-3 py-1.5 text-xs font-semibold hover:bg-bg-section transition-colors',
    btnDanger:
        'rounded-lg p-1 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors',

    // Tabs
    tab: {
        active:
            'px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-green/10 text-brand-green border border-brand-green/30 transition-all',
        inactive:
            'px-3 py-1.5 rounded-lg text-sm font-semibold text-text-secondary hover:text-text-primary transition-all',
    },

    // Badges (text-xs)
    badge: {
        green: 'rounded-full px-2 py-0.5 text-xs font-semibold bg-brand-green/10 text-brand-green',
        blue: 'rounded-full px-2 py-0.5 text-xs font-semibold bg-brand-blue/10 text-brand-blue',
        amber: 'rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600',
        red: 'rounded-full px-2 py-0.5 text-xs font-semibold bg-danger/10 text-danger',
        neutral:
            'rounded-full px-2 py-0.5 text-xs font-semibold bg-bg-section border border-border text-text-secondary',
    },

    // Chips (text-[11px], slightly smaller than badges)
    chip: {
        green: 'rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand-green/10 text-brand-green',
        blue: 'rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand-blue/10 text-brand-blue',
        amber: 'rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600',
        red: 'rounded-full px-2 py-0.5 text-[11px] font-semibold bg-danger/10 text-danger',
        neutral:
            'rounded-full px-2 py-0.5 text-[11px] font-semibold bg-bg-section border border-border text-text-secondary',
    },

    // Modal
    modal: {
        overlay: 'fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4',
        panel: 'w-full max-w-lg bg-bg-card border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh]',
        header: 'flex items-center justify-between px-5 py-4 border-b border-border shrink-0',
        footer: 'px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0',
    },
} as const;

export type ChipVariant = keyof typeof ui.chip;
export type BadgeVariant = keyof typeof ui.badge;
