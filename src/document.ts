import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import * as yaml from 'js-yaml';
import { applyPatch, Operation } from 'fast-json-patch';

export interface Frontmatter {
  [key: string]: any;
  font?: string;
  colors?: {
    bg?: string;
    text?: string;
    link?: string;
  };
}

export interface Section {
  id: string;
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
			const parsed = yaml.load(sections[0]);
			if (parsed && typeof parsed === 'object') {
				frontmatter = parsed as Frontmatter;
				sections = sections.slice(1);
			}
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothing
		}
	} else if(sections[1] !== "") {
		try {
			const parsed = yaml.load(sections[1]);
			if (parsed && typeof parsed === 'object') {
				frontmatter = parsed as Frontmatter;
				sections = sections.slice(2);
			}
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothing
		}
	}

	const sectionObjects: Section[] = sections.map(section => ({
		id: randomUUID(),
		source: section,
	}));

	return {
		filePath,
		sections: sectionObjects,
		frontmatter,
	}
};

const serialize = (doc: Document): string => {
	const parts: string[] = [];

	// Frontmatter
	if (Object.keys(doc.frontmatter).length > 0) {
		const frontmatterYaml = yaml.dump(doc.frontmatter, { indent: 4 }).trimEnd();
		parts.push(`---\n${frontmatterYaml}\n---\n`);
	}

	// Sections joined by ---
	parts.push(doc.sections.map(s => s.source).join('---\n'));

	return parts.join('');
}

export const openDocument = async (filePath: string): Promise<Document> => {
	try {
		const file = await readFile(filePath, 'utf-8');
		return parse(file, filePath);
	} catch(e) {
		throw new Error(`Failed to open document: ${filePath} - ${(e as Error).message}`);
	}
}

const saveDocument = async (doc: Document): Promise<void> => {
	await writeFile(doc.filePath, serialize(doc), 'utf-8');
}

export const patchDocument = async (filePath: string, operations: Operation[], existingDoc?: Document): Promise<Document> => {
	const doc = existingDoc || await openDocument(filePath);
	const { frontmatter, sections } = doc;

	// Apply patch to the mutable parts (not filePath)
	const patchable = { frontmatter, sections };
	applyPatch(patchable, operations);

	// Ensure all sections have IDs (new sections from add won't)
	patchable.sections = patchable.sections.map(s => ({
		...s,
		id: s.id || randomUUID(),
	}));

	const patched: Document = {
		filePath: doc.filePath,
		frontmatter: patchable.frontmatter,
		sections: patchable.sections,
	};

	await saveDocument(patched);
	return patched;
}

export const addSlideAfter = async (filePath: string, afterIndex: number, existingDoc?: Document): Promise<Document> => {
	return patchDocument(filePath, [
		{ op: 'add', path: `/sections/${afterIndex + 1}`, value: { source: '\n# New slide\n\n' } },
	], existingDoc);
}

export const updateFrontmatter = async (filePath: string, frontmatter: Frontmatter, existingDoc?: Document): Promise<Document> => {
	return patchDocument(filePath, [
		{ op: 'replace', path: '/frontmatter', value: frontmatter },
	], existingDoc);
}

export { parse, serialize };
