import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

const markedKatexOptions = markedKatex({
	throwOnError: false,
	displayMode: true,
	output: 'html'
});

marked.use(markedKatexOptions);

export default marked;
