/**
 * Inline diff decorations for CodeMirror
 * Shows AI-suggested changes directly in the editor with accept/reject controls
 */

import {
	EditorView,
	Decoration,
	WidgetType
} from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import type { CodeChange } from '$lib/stores/changes';

// Effects for managing inline diffs
export const addInlineDiff = StateEffect.define<InlineDiff>();
export const removeInlineDiff = StateEffect.define<string>(); // by change id
export const clearAllDiffs = StateEffect.define<void>();

export interface InlineDiff {
	id: string;
	fromLine: number;
	toLine: number;
	oldLines: string[];
	newLines: string[];
	description: string;
}

// Widget for accept/reject buttons
class DiffControlWidget extends WidgetType {
	constructor(
		readonly diffId: string,
		readonly onAccept: (id: string) => void,
		readonly onReject: (id: string) => void
	) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-diff-controls';
		container.innerHTML = `
			<div class="cm-diff-controls-inner">
				<button class="cm-diff-accept" title="Accept change (Cmd+Y)">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					Accept
				</button>
				<button class="cm-diff-reject" title="Reject change (Cmd+N)">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
					Reject
				</button>
			</div>
		`;

		container.querySelector('.cm-diff-accept')?.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onAccept(this.diffId);
		});

		container.querySelector('.cm-diff-reject')?.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onReject(this.diffId);
		});

		return container;
	}

	ignoreEvent() {
		return false;
	}
}

// Widget for showing removed lines
class RemovedLinesWidget extends WidgetType {
	constructor(readonly lines: string[]) {
		super();
	}

	toDOM() {
		const container = document.createElement('div');
		container.className = 'cm-diff-removed-block';

		this.lines.forEach((line) => {
			const lineEl = document.createElement('div');
			lineEl.className = 'cm-diff-removed-line';
			lineEl.innerHTML = `<span class="cm-diff-gutter">-</span><span class="cm-diff-content">${this.escapeHtml(line) || ' '}</span>`;
			container.appendChild(lineEl);
		});

		return container;
	}

	private escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	ignoreEvent() {
		return true;
	}
}

// State field to track all inline diffs
interface DiffState {
	diffs: Map<string, InlineDiff>;
	onAccept: (id: string) => void;
	onReject: (id: string) => void;
}

export function createInlineDiffExtension(
	onAccept: (id: string) => void,
	onReject: (id: string) => void
) {
	const diffStateField = StateField.define<DiffState>({
		create() {
			return { diffs: new Map(), onAccept, onReject };
		},
		update(state, tr) {
			let newDiffs = state.diffs;
			let changed = false;

			for (const effect of tr.effects) {
				if (effect.is(addInlineDiff)) {
					newDiffs = new Map(newDiffs);
					newDiffs.set(effect.value.id, effect.value);
					changed = true;
				} else if (effect.is(removeInlineDiff)) {
					newDiffs = new Map(newDiffs);
					newDiffs.delete(effect.value);
					changed = true;
				} else if (effect.is(clearAllDiffs)) {
					if (newDiffs.size > 0) {
						newDiffs = new Map();
						changed = true;
					}
				}
			}

			return changed ? { ...state, diffs: newDiffs } : state;
		}
	});

	// Compute decorations from diff state
	const diffDecorations = EditorView.decorations.compute([diffStateField], (state) => {
		const diffState = state.field(diffStateField);
		const builder = new RangeSetBuilder<Decoration>();
		const doc = state.doc;

		// Sort diffs by line number
		const sortedDiffs = Array.from(diffState.diffs.values()).sort(
			(a, b) => a.fromLine - b.fromLine
		);

		for (const diff of sortedDiffs) {
			const fromLine = Math.min(diff.fromLine, doc.lines);
			const toLine = Math.min(diff.toLine, doc.lines);

			if (fromLine < 1) continue;

			const lineStart = doc.line(fromLine);

			// Add control widget at the start of the diff region
			builder.add(
				lineStart.from,
				lineStart.from,
				Decoration.widget({
					widget: new DiffControlWidget(diff.id, diffState.onAccept, diffState.onReject),
					side: -1,
					block: true
				})
			);

			// Show removed lines if there are any
			if (diff.oldLines.length > 0) {
				builder.add(
					lineStart.from,
					lineStart.from,
					Decoration.widget({
						widget: new RemovedLinesWidget(diff.oldLines),
						side: -1,
						block: true
					})
				);
			}

			// Highlight new/added lines
			for (let lineNum = fromLine; lineNum <= toLine && lineNum <= doc.lines; lineNum++) {
				const line = doc.line(lineNum);
				builder.add(
					line.from,
					line.from,
					Decoration.line({ class: 'cm-diff-added-line' })
				);
			}
		}

		return builder.finish();
	});

	return [diffStateField, diffDecorations, inlineDiffTheme];
}

// Theme for inline diffs
const inlineDiffTheme = EditorView.theme({
	'.cm-diff-controls': {
		padding: '4px 12px',
		background: 'var(--color-muted)',
		borderTop: '1px solid var(--color-border)',
		borderBottom: '1px solid var(--color-border)',
		marginBottom: '0'
	},
	'.cm-diff-controls-inner': {
		display: 'flex',
		gap: '6px',
		alignItems: 'center'
	},
	'.cm-diff-accept, .cm-diff-reject': {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '3px',
		padding: '2px 8px',
		borderRadius: '4px',
		fontSize: '11px',
		fontWeight: '500',
		cursor: 'pointer',
		transition: 'all 0.15s ease',
		border: 'none',
		fontFamily: 'inherit'
	},
	'.cm-diff-accept': {
		background: 'rgba(34, 197, 94, 0.1)',
		color: 'rgb(22, 163, 74)'
	},
	'.cm-diff-accept:hover': {
		background: 'rgba(34, 197, 94, 0.2)'
	},
	'.cm-diff-reject': {
		background: 'rgba(239, 68, 68, 0.1)',
		color: 'rgb(220, 38, 38)'
	},
	'.cm-diff-reject:hover': {
		background: 'rgba(239, 68, 68, 0.2)'
	},
	'.cm-diff-removed-block': {
		background: 'rgba(239, 68, 68, 0.08)',
		borderLeft: '3px solid rgba(239, 68, 68, 0.5)',
		marginLeft: '0',
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
		fontSize: '14px'
	},
	'.cm-diff-removed-line': {
		display: 'flex',
		padding: '0 16px',
		color: 'rgba(220, 38, 38, 0.8)',
		textDecoration: 'line-through',
		opacity: '0.7'
	},
	'.cm-diff-gutter': {
		width: '20px',
		textAlign: 'center',
		userSelect: 'none',
		color: 'rgb(220, 38, 38)',
		fontWeight: '600',
		marginRight: '8px'
	},
	'.cm-diff-content': {
		flex: '1',
		whiteSpace: 'pre'
	},
	'.cm-diff-added-line': {
		background: 'rgba(34, 197, 94, 0.1) !important',
		borderLeft: '3px solid rgba(34, 197, 94, 0.6)'
	},
	'&.cm-focused .cm-diff-added-line': {
		background: 'rgba(34, 197, 94, 0.12) !important'
	}
});

/**
 * Calculate similarity between two strings (0 to 1)
 */
function similarity(a: string, b: string): number {
	if (a === b) return 1;
	if (!a || !b) return 0;

	const longer = a.length > b.length ? a : b;
	const shorter = a.length > b.length ? b : a;

	if (longer.length === 0) return 1;

	let matches = 0;
	const shorterChars = shorter.split('');
	const longerLower = longer.toLowerCase();

	for (const char of shorterChars) {
		if (longerLower.includes(char.toLowerCase())) {
			matches++;
		}
	}

	return matches / longer.length;
}

/**
 * Find the best matching block of lines in the content
 */
function findBestMatch(
	contentLines: string[],
	searchLines: string[],
	minSimilarity = 0.7
): { startLine: number; endLine: number; score: number } | null {
	if (searchLines.length === 0) return null;

	const normalizedSearch = searchLines.map((l) => l.trim());
	let bestMatch: { startLine: number; endLine: number; score: number } | null = null;

	for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
		let totalScore = 0;
		let allMatch = true;

		for (let j = 0; j < searchLines.length; j++) {
			const contentLine = contentLines[i + j].trim();
			const searchLine = normalizedSearch[j];

			if (contentLine === searchLine) {
				totalScore += 1;
			} else {
				const lineSimilarity = similarity(contentLine, searchLine);
				if (lineSimilarity < minSimilarity) {
					allMatch = false;
					break;
				}
				totalScore += lineSimilarity;
			}
		}

		if (allMatch) {
			const avgScore = totalScore / searchLines.length;
			if (!bestMatch || avgScore > bestMatch.score) {
				bestMatch = {
					startLine: i,
					endLine: i + searchLines.length - 1,
					score: avgScore
				};

				if (avgScore === 1) break;
			}
		}
	}

	return bestMatch;
}

// Helper to convert CodeChange to InlineDiff
export function codeChangeToInlineDiff(
	change: CodeChange,
	content: string
): InlineDiff | null {
	const lines = content.split('\n');
	const oldLines = change.oldCode.split('\n').filter((l) => l.trim() !== '');
	const newLines = change.newCode.split('\n');

	// If no oldCode, this is an append operation - show at end of document
	if (!change.oldCode || change.oldCode.trim() === '') {
		const fromLine = Math.max(1, lines.length);
		return {
			id: change.id,
			fromLine,
			toLine: fromLine + newLines.length - 1,
			oldLines: [],
			newLines,
			description: change.description
		};
	}

	// Try to find a match using fuzzy matching
	const match = findBestMatch(lines, oldLines, 0.7);

	if (match && match.score >= 0.7) {
		const fromLine = match.startLine + 1; // 1-indexed
		const toLine = fromLine + newLines.length - 1;

		return {
			id: change.id,
			fromLine,
			toLine,
			oldLines: change.oldCode.split('\n'),
			newLines,
			description: change.description
		};
	}

	// Fallback: Try exact substring match on trimmed content
	for (let i = 0; i < lines.length; i++) {
		const trimmedLine = lines[i].trim();
		const firstOldLine = oldLines[0]?.trim();

		if (trimmedLine === firstOldLine) {
			let allMatch = true;
			for (let j = 0; j < oldLines.length && i + j < lines.length; j++) {
				if (lines[i + j].trim() !== oldLines[j].trim()) {
					allMatch = false;
					break;
				}
			}
			if (allMatch) {
				const fromLine = i + 1;
				return {
					id: change.id,
					fromLine,
					toLine: fromLine + newLines.length - 1,
					oldLines: change.oldCode.split('\n'),
					newLines,
					description: change.description
				};
			}
		}
	}

	// Could not find match - return null so the floating panel can handle it
	return null;
}
