import { describe, it, expect } from 'vitest';
import { parse, serialize } from './document';
import { applyPatch } from 'fast-json-patch';

describe('document parse/serialize roundtrip', () => {
	it('roundtrips a document with frontmatter and multiple sections', () => {
		const input = `---
colors:
    bg: blue
    text: yellow
    link: white
---

# Slide 1

Some content

---

# Slide 2

- item 1
- item 2

---

# Slide 3
`;

		const doc = parse(input, 'test.md');
		const output = serialize(doc);
		const reparsed = parse(output, 'test.md');

		expect(reparsed.frontmatter).toEqual(doc.frontmatter);
		expect(reparsed.sections.length).toBe(doc.sections.length);
		for (let i = 0; i < doc.sections.length; i++) {
			expect(reparsed.sections[i].source).toBe(doc.sections[i].source);
		}
	});

	it('roundtrips a document without frontmatter', () => {
		const input = `# Slide 1

---

# Slide 2
`;

		const doc = parse(input, 'test.md');
		const output = serialize(doc);
		const reparsed = parse(output, 'test.md');

		expect(reparsed.frontmatter).toEqual({});
		expect(reparsed.sections.length).toBe(doc.sections.length);
		for (let i = 0; i < doc.sections.length; i++) {
			expect(reparsed.sections[i].source).toBe(doc.sections[i].source);
		}
	});

	it('preserves section content including code blocks', () => {
		const input = `---
colors:
    bg: black
---

# Code slide

\`\`\`bash
#!/bin/bash
git status
\`\`\`

---

# Another slide
`;

		const doc = parse(input, 'test.md');
		const output = serialize(doc);
		const reparsed = parse(output, 'test.md');

		expect(reparsed.sections.length).toBe(doc.sections.length);
		expect(reparsed.sections[0].source).toBe(doc.sections[0].source);
		expect(reparsed.sections[0].source).toContain('```bash');
	});

	it('preserves frontmatter values through roundtrip', () => {
		const input = `---
colors:
    bg: blue
    text: yellow
    link: white
---

# Slide 1
`;

		const doc = parse(input, 'test.md');
		const output = serialize(doc);
		const reparsed = parse(output, 'test.md');

		expect(reparsed.frontmatter.colors.bg).toBe('blue');
		expect(reparsed.frontmatter.colors.text).toBe('yellow');
		expect(reparsed.frontmatter.colors.link).toBe('white');
	});
});

describe('JSON Patch on document', () => {
	const makeDoc = (input: string) => {
		const doc = parse(input, 'test.md');
		return { frontmatter: doc.frontmatter, sections: doc.sections };
	};

	it('adds a slide via patch', () => {
		const input = `---
colors:
    bg: black
---

# Slide 1

---

# Slide 2
`;
		const patchable = makeDoc(input);
		applyPatch(patchable, [
			{ op: 'add', path: '/sections/1', value: { source: '\n# Inserted\n\n' } },
		]);

		expect(patchable.sections.length).toBe(3);
		expect(patchable.sections[1].source).toContain('# Inserted');

		const serialized = serialize({ filePath: 'test.md', ...patchable });
		const reparsed = parse(serialized, 'test.md');
		expect(reparsed.sections.length).toBe(3);
		expect(reparsed.sections[1].source).toContain('# Inserted');
	});

	it('removes a slide via patch', () => {
		const input = `---
colors:
    bg: black
---

# Slide 1

---

# Slide 2

---

# Slide 3
`;
		const patchable = makeDoc(input);
		applyPatch(patchable, [
			{ op: 'remove', path: '/sections/1' },
		]);

		expect(patchable.sections.length).toBe(2);
		expect(patchable.sections[0].source).toContain('# Slide 1');
		expect(patchable.sections[1].source).toContain('# Slide 3');

		const serialized = serialize({ filePath: 'test.md', ...patchable });
		const reparsed = parse(serialized, 'test.md');
		expect(reparsed.sections.length).toBe(2);
	});

	it('replaces frontmatter color via patch', () => {
		const input = `---
colors:
    bg: blue
    text: yellow
---

# Slide 1
`;
		const patchable = makeDoc(input);
		applyPatch(patchable, [
			{ op: 'replace', path: '/frontmatter/colors/bg', value: 'red' },
		]);

		expect(patchable.frontmatter.colors.bg).toBe('red');
		expect(patchable.frontmatter.colors.text).toBe('yellow');

		const serialized = serialize({ filePath: 'test.md', ...patchable });
		const reparsed = parse(serialized, 'test.md');
		expect(reparsed.frontmatter.colors.bg).toBe('red');
	});

	it('replaces slide content via patch', () => {
		const input = `
# Slide 1

---

# Slide 2
`;
		const patchable = makeDoc(input);
		applyPatch(patchable, [
			{ op: 'replace', path: '/sections/0/source', value: '\n# Updated\n\n' },
		]);

		expect(patchable.sections[0].source).toContain('# Updated');

		const serialized = serialize({ filePath: 'test.md', ...patchable });
		const reparsed = parse(serialized, 'test.md');
		expect(reparsed.sections[0].source).toContain('# Updated');
		expect(reparsed.sections[1].source).toContain('# Slide 2');
	});
});
