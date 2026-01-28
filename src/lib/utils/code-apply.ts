/**
 * Utility for applying code changes with fuzzy matching
 * Handles whitespace differences and finds the best match location
 */

export interface ApplyResult {
	success: boolean;
	content: string;
	matchedAt?: number; // Line number where match was found
	error?: string;
}

/**
 * Normalize whitespace for comparison
 * - Trims leading/trailing whitespace from each line
 * - Collapses multiple spaces to single space
 * - Preserves line structure
 */
function normalizeWhitespace(code: string): string {
	return code
		.split('\n')
		.map((line) => line.trim().replace(/\s+/g, ' '))
		.join('\n');
}

/**
 * Calculate similarity between two strings (0 to 1)
 * Uses Levenshtein-inspired approach for speed
 */
function similarity(a: string, b: string): number {
	if (a === b) return 1;
	if (!a || !b) return 0;

	const longer = a.length > b.length ? a : b;
	const shorter = a.length > b.length ? b : a;

	if (longer.length === 0) return 1;

	// Use a simplified comparison for performance
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
 * Returns the start line index and match quality
 */
function findBestMatch(
	contentLines: string[],
	searchLines: string[],
	minSimilarity = 0.7
): { startLine: number; endLine: number; score: number } | null {
	if (searchLines.length === 0) return null;

	const normalizedSearch = searchLines.map((l) => l.trim());
	let bestMatch: { startLine: number; endLine: number; score: number } | null = null;

	// Slide window through content
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

				// Perfect match - no need to continue
				if (avgScore === 1) break;
			}
		}
	}

	return bestMatch;
}

/**
 * Apply a code change to content
 * Tries multiple matching strategies
 */
export function applyCodeChange(
	content: string,
	oldCode: string,
	newCode: string
): ApplyResult {
	// If no oldCode, this is an append operation
	if (!oldCode || oldCode.trim() === '') {
		return {
			success: true,
			content: content + '\n' + newCode,
			error: 'Appended new code (no old code to replace)'
		};
	}

	// Strategy 1: Exact match
	if (content.includes(oldCode)) {
		const matchIndex = content.indexOf(oldCode);
		const lineNumber = content.substring(0, matchIndex).split('\n').length;
		return {
			success: true,
			content: content.replace(oldCode, newCode),
			matchedAt: lineNumber
		};
	}

	// Strategy 2: Trimmed match (handle trailing/leading whitespace)
	const trimmedOld = oldCode.trim();
	if (content.includes(trimmedOld)) {
		const matchIndex = content.indexOf(trimmedOld);
		const lineNumber = content.substring(0, matchIndex).split('\n').length;
		return {
			success: true,
			content: content.replace(trimmedOld, newCode.trim()),
			matchedAt: lineNumber
		};
	}

	// Strategy 3: Line-by-line fuzzy match
	const contentLines = content.split('\n');
	const oldLines = oldCode.split('\n').filter((l) => l.trim() !== '');

	if (oldLines.length > 0) {
		const match = findBestMatch(contentLines, oldLines);

		if (match && match.score >= 0.8) {
			// Preserve indentation from the original content
			const originalIndent = contentLines[match.startLine].match(/^(\s*)/)?.[1] || '';
			const newLines = newCode.split('\n').map((line, i) => {
				if (i === 0) return originalIndent + line.trim();
				// Try to preserve relative indentation
				const lineIndent = line.match(/^(\s*)/)?.[1] || '';
				return originalIndent + lineIndent + line.trim();
			});

			const resultLines = [
				...contentLines.slice(0, match.startLine),
				...newLines,
				...contentLines.slice(match.endLine + 1)
			];

			return {
				success: true,
				content: resultLines.join('\n'),
				matchedAt: match.startLine + 1
			};
		}
	}

	// Strategy 4: Normalized whitespace match
	const normalizedContent = normalizeWhitespace(content);
	const normalizedOld = normalizeWhitespace(oldCode);

	if (normalizedContent.includes(normalizedOld)) {
		// Find the region in the original content
		const normalizedLines = normalizedContent.split('\n');
		const normalizedOldLines = normalizedOld.split('\n');

		const match = findBestMatch(content.split('\n'), oldCode.split('\n'), 0.6);

		if (match) {
			const resultLines = content.split('\n');
			const newLines = newCode.split('\n');

			resultLines.splice(match.startLine, match.endLine - match.startLine + 1, ...newLines);

			return {
				success: true,
				content: resultLines.join('\n'),
				matchedAt: match.startLine + 1
			};
		}
	}

	// No match found
	return {
		success: false,
		content,
		error: 'Could not find matching code to replace. The code may have been modified.'
	};
}

/**
 * Find where in the content a code block would be inserted
 * Based on context clues like nearby code patterns
 */
export function findInsertionPoint(
	content: string,
	contextBefore?: string,
	contextAfter?: string
): number | null {
	const lines = content.split('\n');

	// If we have context before, find the last line that matches
	if (contextBefore) {
		const contextLines = contextBefore.trim().split('\n');
		const lastContextLine = contextLines[contextLines.length - 1].trim();

		for (let i = lines.length - 1; i >= 0; i--) {
			if (lines[i].trim() === lastContextLine) {
				return i + 1; // Insert after this line
			}
		}
	}

	// If we have context after, find the first line that matches
	if (contextAfter) {
		const contextLines = contextAfter.trim().split('\n');
		const firstContextLine = contextLines[0].trim();

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === firstContextLine) {
				return i; // Insert before this line
			}
		}
	}

	return null;
}

/**
 * Insert code at a specific line number
 */
export function insertCodeAtLine(content: string, newCode: string, lineNumber: number): string {
	const lines = content.split('\n');
	const insertIndex = Math.max(0, Math.min(lineNumber, lines.length));

	lines.splice(insertIndex, 0, newCode);
	return lines.join('\n');
}
