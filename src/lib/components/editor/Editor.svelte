<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		EditorView,
		keymap,
		lineNumbers,
		highlightActiveLine,
		highlightActiveLineGutter,
		drawSelection,
		dropCursor,
		rectangularSelection,
		crosshairCursor
	} from '@codemirror/view';
	import { EditorState, Compartment } from '@codemirror/state';
	import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
	import {
		bracketMatching,
		foldGutter,
		indentOnInput,
		syntaxHighlighting,
		defaultHighlightStyle,
		HighlightStyle
	} from '@codemirror/language';
	import {
		autocompletion,
		completionKeymap,
		closeBrackets,
		closeBracketsKeymap
	} from '@codemirror/autocomplete';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { markdown } from '@codemirror/lang-markdown';
	import { tags } from '@lezer/highlight';
	import { vim } from '@replit/codemirror-vim';
	import { createLatexLanguage } from './latex-language';
	import { editorStore, settingsStore, changesStore, pendingChanges } from '$lib/stores';
	import type { CodeChange } from '$lib/stores/changes';
	import {
		createInlineDiffExtension,
		addInlineDiff,
		removeInlineDiff,
		clearAllDiffs,
		codeChangeToInlineDiff
	} from './inline-diff';
	import { applyCodeChange } from '$lib/utils/code-apply';
	import SelectionPopover from './SelectionPopover.svelte';

	interface Props {
		content: string;
		format: 'latex' | 'typst';
		onchange?: (content: string) => void;
		onScroll?: (percent: number) => void;
		onAskAboutSelection?: (selection: string, question: string) => void;
	}

	let { content, format, onchange, onScroll, onAskAboutSelection }: Props = $props();

	let editorContainer: HTMLDivElement;
	let view = $state<EditorView | null>(null);

	// Selection popover state
	let showSelectionPopover = $state(false);
	let selectionText = $state('');
	let selectionPosition = $state({ x: 0, y: 0 });
	let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

	// Expose gotoLine for external navigation
	export function gotoLine(lineNumber: number) {
		if (view) {
			const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
			view.dispatch({
				selection: { anchor: line.from },
				effects: EditorView.scrollIntoView(line.from, { y: 'center' })
			});
			view.focus();
		}
	}

	// Expose scrollToPercent for linked scrolling
	export function scrollToPercent(percent: number) {
		if (view) {
			const scroller = view.scrollDOM;
			if (scroller.scrollHeight > scroller.clientHeight) {
				scroller.scrollTop = percent * (scroller.scrollHeight - scroller.clientHeight);
			}
		}
	}

	// Handle selection for popover
	function handleSelectionChange(selectedText: string, coords: { x: number; y: number } | null) {
		// Clear any pending timeout
		if (selectionTimeout) {
			clearTimeout(selectionTimeout);
			selectionTimeout = null;
		}

		if (selectedText && selectedText.trim().length > 0 && coords && onAskAboutSelection) {
			// Delay showing the popover slightly to avoid flicker
			selectionTimeout = setTimeout(() => {
				selectionText = selectedText;
				selectionPosition = coords;
				showSelectionPopover = true;
			}, 300);
		} else {
			showSelectionPopover = false;
			selectionText = '';
		}
	}

	function handleAskAboutSelection(question: string) {
		if (selectionText && onAskAboutSelection) {
			onAskAboutSelection(selectionText, question);
			showSelectionPopover = false;
			selectionText = '';
		}
	}

	function closeSelectionPopover() {
		showSelectionPopover = false;
		selectionText = '';
		if (selectionTimeout) {
			clearTimeout(selectionTimeout);
			selectionTimeout = null;
		}
	}
	let languageCompartment = new Compartment();
	let themeCompartment = new Compartment();
	let vimCompartment = new Compartment();
	let lineWrapCompartment = new Compartment();

	// Light theme definition
	const lightTheme = EditorView.theme(
		{
			'&': {
				backgroundColor: '#ffffff',
				color: '#1a1a1a'
			},
			'.cm-content': {
				caretColor: '#1a1a1a'
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: '#1a1a1a'
			},
			'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
				{
					backgroundColor: '#e5e5e5'
				},
			'.cm-panels': {
				backgroundColor: '#f5f5f5',
				color: '#1a1a1a'
			},
			'.cm-panels.cm-panels-top': {
				borderBottom: '1px solid #e5e5e5'
			},
			'.cm-panels.cm-panels-bottom': {
				borderTop: '1px solid #e5e5e5'
			},
			'.cm-searchMatch': {
				backgroundColor: '#ffdd4433',
				outline: '1px solid #ffdd44'
			},
			'.cm-searchMatch.cm-searchMatch-selected': {
				backgroundColor: '#ff660033'
			},
			'.cm-activeLine': {
				backgroundColor: '#f5f5f5'
			},
			'.cm-selectionMatch': {
				backgroundColor: '#e5e5e5'
			},
			'&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
				outline: '1px solid #6b6b6b'
			},
			'.cm-gutters': {
				backgroundColor: '#f9f9f9',
				color: '#a3a3a3',
				border: 'none'
			},
			'.cm-activeLineGutter': {
				backgroundColor: '#f0f0f0'
			},
			'.cm-foldPlaceholder': {
				backgroundColor: 'transparent',
				border: 'none',
				color: '#6b6b6b'
			},
			'.cm-tooltip': {
				border: '1px solid #e5e5e5',
				backgroundColor: '#ffffff'
			},
			'.cm-tooltip .cm-tooltip-arrow:before': {
				borderTopColor: 'transparent',
				borderBottomColor: 'transparent'
			},
			'.cm-tooltip .cm-tooltip-arrow:after': {
				borderTopColor: '#ffffff',
				borderBottomColor: '#ffffff'
			},
			'.cm-tooltip-autocomplete': {
				'& > ul > li[aria-selected]': {
					backgroundColor: '#e5e5e5',
					color: '#1a1a1a'
				}
			}
		},
		{ dark: false }
	);

	const lightHighlightStyle = HighlightStyle.define([
		{ tag: tags.keyword, color: '#d73a49' },
		{ tag: tags.comment, color: '#6a737d', fontStyle: 'italic' },
		{ tag: tags.string, color: '#032f62' },
		{ tag: tags.number, color: '#005cc5' },
		{ tag: tags.variableName, color: '#24292e' },
		{ tag: tags.function(tags.variableName), color: '#6f42c1' },
		{ tag: tags.typeName, color: '#22863a' },
		{ tag: tags.operator, color: '#d73a49' },
		{ tag: tags.bracket, color: '#24292e' },
		{ tag: tags.punctuation, color: '#24292e' },
		{ tag: tags.meta, color: '#005cc5' },
		{ tag: tags.link, color: '#032f62', textDecoration: 'underline' },
		{ tag: tags.heading, color: '#005cc5', fontWeight: 'bold' },
		{ tag: tags.emphasis, fontStyle: 'italic' },
		{ tag: tags.strong, fontWeight: 'bold' }
	]);

	function getLanguage(fmt: string) {
		if (fmt === 'typst') {
			return markdown();
		}
		return createLatexLanguage();
	}

	function getTheme(lightMode: boolean) {
		if (lightMode) {
			return [lightTheme, syntaxHighlighting(lightHighlightStyle)];
		}
		return [oneDark];
	}

	function getVimExtension(enabled: boolean) {
		return enabled ? vim() : [];
	}

	function getLineWrap(enabled: boolean) {
		return enabled ? EditorView.lineWrapping : [];
	}

	// Inline diff handlers
	function handleAcceptChange(changeId: string) {
		const change = $pendingChanges.find((c) => c.id === changeId);
		if (!change || !view) return;

		const currentContent = view.state.doc.toString();
		const result = applyCodeChange(currentContent, change.oldCode, change.newCode);

		if (result.success) {
			// Directly update CodeMirror - this ensures immediate visual update
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: result.content },
				effects: [removeInlineDiff.of(changeId)]
			});
			onchange?.(result.content); // Notify parent
			changesStore.acceptChange(changeId);
		}
	}

	function handleRejectChange(changeId: string) {
		if (!view) return;
		view.dispatch({
			effects: [removeInlineDiff.of(changeId)]
		});
		changesStore.rejectChange(changeId);
	}

	// Create inline diff extension with handlers
	const inlineDiffExtension = createInlineDiffExtension(handleAcceptChange, handleRejectChange);

	// Track which changes are currently shown in the editor (reactive for proper effect tracking)
	let displayedChangeIds = $state<Set<string>>(new Set());

	function createUpdateListener() {
		return EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const newContent = update.state.doc.toString();
				onchange?.(newContent);
			}

			// Update cursor position
			const { head } = update.state.selection.main;
			const line = update.state.doc.lineAt(head);
			editorStore.setCursorPosition(line.number, head - line.from + 1);

			// Update selection
			const { from, to } = update.state.selection.main;
			if (from !== to) {
				editorStore.setSelection({ from, to });

				// Handle selection for popover - only if the callback is provided
				if (onAskAboutSelection) {
					const selectedText = update.state.sliceDoc(from, to);
					// Get the position of the selection end for positioning the popover
					const coords = update.view.coordsAtPos(to);
					if (coords) {
						handleSelectionChange(selectedText, { x: coords.left, y: coords.bottom + 8 });
					}
				}
			} else {
				editorStore.setSelection(null);
				// Close popover when selection is cleared
				if (showSelectionPopover) {
					closeSelectionPopover();
				}
			}
		});
	}

	onMount(() => {
		const initialSettings = $settingsStore.editor;

		const startState = EditorState.create({
			doc: content,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				history(),
				foldGutter(),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of(true),
				indentOnInput(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),
				rectangularSelection(),
				crosshairCursor(),
				highlightActiveLine(),
				keymap.of([
					...closeBracketsKeymap,
					...defaultKeymap,
					...historyKeymap,
					...completionKeymap,
					indentWithTab
				]),
				languageCompartment.of(getLanguage(format)),
				themeCompartment.of(getTheme(initialSettings.lightMode)),
				vimCompartment.of(getVimExtension(initialSettings.vimMode)),
				lineWrapCompartment.of(getLineWrap(initialSettings.wordWrap)),
				createUpdateListener(),
				inlineDiffExtension,
				EditorView.theme({
					'&': {
						height: '100%',
						fontSize: '14px'
					},
					'.cm-scroller': {
						fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
					},
					'.cm-content': {
						padding: '16px 0'
					},
					'.cm-line': {
						padding: '0 16px'
					}
				})
			]
		});

		view = new EditorView({
			state: startState,
			parent: editorContainer
		});

		editorStore.setContent(content);

		// Add scroll listener for linked scrolling
		const scroller = view.scrollDOM;
		const handleEditorScroll = () => {
			if (scroller.scrollHeight > scroller.clientHeight && onScroll) {
				const percent = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight);
				onScroll(percent);
			}
		};
		scroller.addEventListener('scroll', handleEditorScroll);

		return () => {
			scroller.removeEventListener('scroll', handleEditorScroll);
		};
	});

	onDestroy(() => {
		view?.destroy();
	});

	// Update content when prop changes (e.g., switching files)
	$effect(() => {
		if (view && content !== view.state.doc.toString()) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: content
				}
			});
		}
	});

	// Update language when format changes
	$effect(() => {
		if (view) {
			view.dispatch({
				effects: languageCompartment.reconfigure(getLanguage(format))
			});
		}
	});

	// Update theme when lightMode changes
	$effect(() => {
		if (view) {
			const lightMode = $settingsStore.editor.lightMode;
			view.dispatch({
				effects: themeCompartment.reconfigure(getTheme(lightMode))
			});
		}
	});

	// Update vim mode when setting changes
	$effect(() => {
		if (view) {
			const vimMode = $settingsStore.editor.vimMode;
			view.dispatch({
				effects: vimCompartment.reconfigure(getVimExtension(vimMode))
			});
		}
	});

	// Update line wrapping when setting changes
	$effect(() => {
		if (view) {
			const wordWrap = $settingsStore.editor.wordWrap;
			view.dispatch({
				effects: lineWrapCompartment.reconfigure(getLineWrap(wordWrap))
			});
		}
	});

	// Sync pending changes to inline diffs
	$effect(() => {
		if (!view) return;

		const changes = $pendingChanges;
		const currentContent = view.state.doc.toString();
		const currentChangeIds = new Set(changes.map((c) => c.id));
		let newDisplayedIds = new Set(displayedChangeIds);
		let changed = false;

		// Remove diffs for changes that are no longer pending
		for (const id of displayedChangeIds) {
			if (!currentChangeIds.has(id)) {
				view.dispatch({
					effects: [removeInlineDiff.of(id)]
				});
				newDisplayedIds.delete(id);
				changed = true;
			}
		}

		// Add diffs for new changes
		for (const change of changes) {
			if (!newDisplayedIds.has(change.id)) {
				const inlineDiff = codeChangeToInlineDiff(change, currentContent);
				if (inlineDiff) {
					view.dispatch({
						effects: [addInlineDiff.of(inlineDiff)]
					});
					newDisplayedIds.add(change.id);
					changed = true;
					console.log('Added inline diff for change:', change.id, inlineDiff);
				} else {
					console.log('Could not create inline diff for change:', change.id, 'oldCode:', change.oldCode?.substring(0, 50));
				}
			}
		}

		if (changed) {
			displayedChangeIds = newDisplayedIds;
		}
	});

	// Clear all diffs when file changes
	$effect(() => {
		// This effect tracks `content` prop changes (file switch)
		const _ = content; // Create dependency on content prop
		if (view) {
			// Clear displayed change tracking when file changes
			displayedChangeIds = new Set();
			view.dispatch({
				effects: [clearAllDiffs.of(undefined)]
			});
		}
	});
</script>

<div bind:this={editorContainer} class="h-full w-full overflow-hidden"></div>

<!-- Selection Popover -->
{#if showSelectionPopover && selectionText}
	<SelectionPopover
		selectedText={selectionText}
		position={selectionPosition}
		onAsk={handleAskAboutSelection}
		onClose={closeSelectionPopover}
	/>
{/if}

<style>
	:global(.cm-editor) {
		height: 100%;
	}

	:global(.cm-vim-panel) {
		padding: 4px 8px;
		font-size: 12px;
		background: var(--color-muted);
		border-top: 1px solid var(--color-border);
	}

	:global(.cm-fat-cursor) {
		background: var(--color-primary) !important;
		opacity: 0.7;
	}
</style>
