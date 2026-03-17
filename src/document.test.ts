import { describe, it, expect } from 'vitest';
import { parse, serialize } from './document';

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
