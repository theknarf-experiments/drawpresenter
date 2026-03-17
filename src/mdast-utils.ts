import { createProcessor } from '@mdx-js/mdx';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

const parser = createProcessor();

const serializer = unified()
	.use(remarkParse)
	.use(remarkMdx)
	.use(remarkStringify);

export const parseMarkdown = (source: string) => {
	return parser.parse(source);
};

export const serializeMarkdown = (tree: any): string => {
	return serializer.stringify(tree);
};
