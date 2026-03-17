import { createProcessor } from '@mdx-js/mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

const parser = createProcessor();

const serializer = unified()
	.use(remarkParse)
	.use(remarkMdx)
	.use(remarkStringify, { bullet: '-' });

export const parseMarkdown = (source: string) => {
	return parser.parse(source);
};

export const serializeMarkdown = (tree: any, originalSource?: string): string => {
	let output = serializer.stringify(tree);

	// Preserve leading/trailing whitespace from the original source
	if (originalSource) {
		const leadingMatch = originalSource.match(/^(\s*)/);
		const trailingMatch = originalSource.match(/(\s*)$/);
		const leading = leadingMatch ? leadingMatch[1] : '';
		const trailing = trailingMatch ? trailingMatch[1] : '';

		output = leading + output.replace(/^\s+/, '').replace(/\s+$/, '') + trailing;
	}

	return output;
};
