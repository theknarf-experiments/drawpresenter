import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';

export interface Frontmatter {
  [key: string]: any;
  colors?: {
    bg?: string;
    text?: string;
    link?: string;
  };
}

export interface Section {
  source: string;
}

export interface Document {
  filePath: string;
  sections: Section[];
  frontmatter: Frontmatter;
}

const parse = (text: string, filePath: string): Document => {
	// Parsing logic:
	//  - Split based on "---" as sections
	//  - Check if the first section is yaml / frontmatter
	//  - Parse the rest as MDX

	let sections = text.split(/-{3}(?:\r\n|\r|\n)/)
	let frontmatter: Frontmatter = {};

	// Try to parse frontmatter either in section 0 or 1
	if(sections[0] !== "") {
		try {
			frontmatter = yaml.load(sections[0]) as Frontmatter || {};
			sections = sections.slice(1);
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothing
		}
	} else if(sections[1] !== "") {
		try {
			frontmatter = yaml.load(sections[1]) as Frontmatter || {};
			sections = sections.slice(2);
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothing
		}
	}

	const sectionObjects: Section[] = sections.map(section => {
		let source = section;
		// Rewrite image src to use /files/ for relative paths
		source = source.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
			if (!src.startsWith('http') && !src.startsWith('/')) {
				src = '/files/' + src;
			}
			return `![${alt}](${src})`;
		});
		return {
			source,
		};
	});

	//console.log(sections)

	return {
		filePath,
		sections: sectionObjects,
		frontmatter,
	}
};

const serialize = (doc: Document): string => {
	// Map over objects doc.sections
	//  - turn frontmatter and mdx back to markdown
	// join on newline
	// return markdown text
	return '';
}

// doc.merge(doc2);
// doc.section[0].isFrontmatter?
// doc.section.add
// doc.section.remove
// doc.section[].

export const openDocument = async (filePath: string): Promise<Document> => {
	try {
		const file = await readFile(filePath, 'utf-8');
		return parse(file, filePath);
	} catch(e) {
		throw new Error(`Failed to open document: ${filePath} - ${(e as Error).message}`);
	}
}

export { parse, serialize };
