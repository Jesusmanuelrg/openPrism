export {
	searchSemanticScholar,
	searchArxiv,
	getPaperByDoi,
	type Paper,
	type SearchResult
} from './literature';

export {
	generateCiteKey,
	paperToBibTeX,
	doiToBibTeX,
	parseBibTeX,
	type BibTeXEntry
} from './citation';
