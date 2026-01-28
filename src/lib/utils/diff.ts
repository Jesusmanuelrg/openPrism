/**
 * Simple diff algorithm for displaying code changes
 * Uses a basic line-by-line comparison with LCS (Longest Common Subsequence)
 */

export type DiffLineType = 'add' | 'remove' | 'unchanged';

export interface DiffLine {
	type: DiffLineType;
	content: string;
	oldLineNumber?: number;
	newLineNumber?: number;
}

/**
 * Compute the Longest Common Subsequence of two arrays
 */
function lcs<T>(a: T[], b: T[]): T[] {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array(m + 1)
		.fill(null)
		.map(() => Array(n + 1).fill(0));

	// Build the DP table
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	// Backtrack to find the LCS
	const result: T[] = [];
	let i = m,
		j = n;
	while (i > 0 && j > 0) {
		if (a[i - 1] === b[j - 1]) {
			result.unshift(a[i - 1]);
			i--;
			j--;
		} else if (dp[i - 1][j] > dp[i][j - 1]) {
			i--;
		} else {
			j--;
		}
	}

	return result;
}

/**
 * Compute a diff between two code strings
 * Returns an array of DiffLine objects for rendering
 */
export function computeDiff(oldCode: string, newCode: string): DiffLine[] {
	const oldLines = oldCode.split('\n');
	const newLines = newCode.split('\n');

	// Handle empty cases
	if (!oldCode && !newCode) return [];
	if (!oldCode) {
		return newLines.map((content, i) => ({
			type: 'add' as const,
			content,
			newLineNumber: i + 1
		}));
	}
	if (!newCode) {
		return oldLines.map((content, i) => ({
			type: 'remove' as const,
			content,
			oldLineNumber: i + 1
		}));
	}

	// Find the LCS of lines
	const common = lcs(oldLines, newLines);
	const result: DiffLine[] = [];

	let oldIdx = 0;
	let newIdx = 0;
	let oldLineNum = 1;
	let newLineNum = 1;

	for (const commonLine of common) {
		// Add removed lines (in old but not in common yet)
		while (oldIdx < oldLines.length && oldLines[oldIdx] !== commonLine) {
			result.push({
				type: 'remove',
				content: oldLines[oldIdx],
				oldLineNumber: oldLineNum++
			});
			oldIdx++;
		}

		// Add new lines (in new but not in common yet)
		while (newIdx < newLines.length && newLines[newIdx] !== commonLine) {
			result.push({
				type: 'add',
				content: newLines[newIdx],
				newLineNumber: newLineNum++
			});
			newIdx++;
		}

		// Add the common line as unchanged
		result.push({
			type: 'unchanged',
			content: commonLine,
			oldLineNumber: oldLineNum++,
			newLineNumber: newLineNum++
		});
		oldIdx++;
		newIdx++;
	}

	// Add remaining removed lines
	while (oldIdx < oldLines.length) {
		result.push({
			type: 'remove',
			content: oldLines[oldIdx],
			oldLineNumber: oldLineNum++
		});
		oldIdx++;
	}

	// Add remaining new lines
	while (newIdx < newLines.length) {
		result.push({
			type: 'add',
			content: newLines[newIdx],
			newLineNumber: newLineNum++
		});
		newIdx++;
	}

	return result;
}

/**
 * Compute a simplified inline diff for a single line
 * Highlights the specific characters that changed
 */
export function computeInlineDiff(
	oldLine: string,
	newLine: string
): { old: { text: string; highlight: boolean }[]; new: { text: string; highlight: boolean }[] } {
	// Simple character-level diff for short strings
	if (oldLine.length > 200 || newLine.length > 200) {
		return {
			old: [{ text: oldLine, highlight: true }],
			new: [{ text: newLine, highlight: true }]
		};
	}

	const oldChars = oldLine.split('');
	const newChars = newLine.split('');
	const commonChars = lcs(oldChars, newChars);

	// Build highlighted segments for old line
	const oldResult: { text: string; highlight: boolean }[] = [];
	let commonIdx = 0;
	let segment = '';
	let isHighlight = false;

	for (const char of oldChars) {
		if (commonIdx < commonChars.length && char === commonChars[commonIdx]) {
			if (isHighlight && segment) {
				oldResult.push({ text: segment, highlight: true });
				segment = '';
			}
			isHighlight = false;
			segment += char;
			commonIdx++;
		} else {
			if (!isHighlight && segment) {
				oldResult.push({ text: segment, highlight: false });
				segment = '';
			}
			isHighlight = true;
			segment += char;
		}
	}
	if (segment) {
		oldResult.push({ text: segment, highlight: isHighlight });
	}

	// Build highlighted segments for new line
	const newResult: { text: string; highlight: boolean }[] = [];
	commonIdx = 0;
	segment = '';
	isHighlight = false;

	for (const char of newChars) {
		if (commonIdx < commonChars.length && char === commonChars[commonIdx]) {
			if (isHighlight && segment) {
				newResult.push({ text: segment, highlight: true });
				segment = '';
			}
			isHighlight = false;
			segment += char;
			commonIdx++;
		} else {
			if (!isHighlight && segment) {
				newResult.push({ text: segment, highlight: false });
				segment = '';
			}
			isHighlight = true;
			segment += char;
		}
	}
	if (segment) {
		newResult.push({ text: segment, highlight: isHighlight });
	}

	return { old: oldResult, new: newResult };
}
