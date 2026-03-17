import { readFile, writeFile } from 'fs/promises';
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

export const addSlideAfter = async (filePath: string, afterIndex: number): Promise<Document> => {
	const file = await readFile(filePath, 'utf-8');

	// Split on --- separators, preserving them
	const parts = file.split(/(^|\n)---\n/);

	// Reconstruct as raw sections (keeping frontmatter detection simple by
	// working with the same split the parser uses)
	const rawSections = file.split(/---\n/);

	// Insert a new empty slide after the given index.
	// Account for frontmatter: the raw file has frontmatter occupying
	// section(s) before the content sections. We find the right insertion
	// point by counting --- separators.
	const lines = file.split('\n');
	let separatorCount = 0;
	let insertLineIndex = lines.length; // default: end of file

	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === '---') {
			separatorCount++;
		}
		// We need to go past (afterIndex + 1) separators to find the end
		// of the target slide (the +1 accounts for the frontmatter closing ---)
		// But the first --- after frontmatter starts slide 0, so we need
		// afterIndex + 2 separators to be past slide afterIndex
		if (separatorCount === afterIndex + 2) {
			insertLineIndex = i;
			break;
		}
	}

	// If we didn't find enough separators, insert at end of file
	const newSlide = '\n# New slide\n\n---';
	lines.splice(insertLineIndex, 0, newSlide);

	const newContent = lines.join('\n');
	await writeFile(filePath, newContent, 'utf-8');

	return parse(newContent, filePath);
}

export const updateFrontmatter = async (filePath: string, frontmatter: Frontmatter): Promise<Document> => {
	const file = await readFile(filePath, 'utf-8');
	const newYaml = yaml.dump(frontmatter, { indent: 4 }).trimEnd();

	// Check if the file already has frontmatter (starts with --- or has empty first line then ---)
	const frontmatterRegex = /^(---\n[\s\S]*?\n---\n|[\s\S]*?\n---\n)/;
	const lines = file.split('\n');

	let newContent: string;

	// Detect existing frontmatter format
	if (lines[0] === '---') {
		// Format: ---\nyaml\n---\n...
		const closingIndex = lines.indexOf('---', 1);
		if (closingIndex !== -1) {
			const after = lines.slice(closingIndex + 1).join('\n');
			newContent = `---\n${newYaml}\n---\n${after}`;
		} else {
			newContent = `---\n${newYaml}\n---\n${file}`;
		}
	} else {
		// Try parsing first section as yaml (format without leading ---)
		const sections = file.split(/-{3}(?:\r\n|\r|\n)/);
		if (sections[0] !== '') {
			try {
				yaml.load(sections[0]);
				// First section is valid yaml frontmatter, replace it
				const after = sections.slice(1).join('---\n');
				newContent = `${newYaml}\n---\n${after}`;
			} catch {
				// No frontmatter, prepend it
				newContent = `---\n${newYaml}\n---\n${file}`;
			}
		} else {
			// No frontmatter, prepend it
			newContent = `---\n${newYaml}\n---\n${file}`;
		}
	}

	await writeFile(filePath, newContent, 'utf-8');
	return parse(newContent, filePath);
}

export { parse, serialize };
