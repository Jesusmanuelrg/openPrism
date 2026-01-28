/**
 * Fuzzy string matching utilities for code comparison
 */

export interface MatchResult {
	startLine: number;
	endLine: number;
	score: number;
}

/**
 * Calculate similarity between two strings (0 to 1)
 * Uses a character-matching approach for performance
 */
export function similarity(a: string, b: string): number {
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
 * Returns the start line index, end line index, and match quality score
 */
export function findBestMatch(
	contentLines: string[],
	searchLines: string[],
	minSimilarity = 0.7
): MatchResult | null {
	if (searchLines.length === 0) return null;

	const normalizedSearch = searchLines.map((l) => l.trim());
	let bestMatch: MatchResult | null = null;

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
