const fs = require('fs');
const yaml = require('js-yaml');

const parse = (text, filePath) => {
	// Parsing logic:
	//  - Split based on "---" as sections
	//  - Check if the first section is yaml / frontmatter
	//  - Parse the rest as MDX
	
	let sections = text.split(/-{3}(?:\r\n|\r|\n)/)

	// Try to parse frontmatter either in section 0 or 1
	if(sections[0] !== "") {
		try {
			const data = yaml.load(sections[0]);
			sections[0] = {
				source: sections[0],
				frontmatter: true,
				data,
			};
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothign
		}
	} else if(sections[1] !== "") {
		try {
			const data = yaml.load(sections[1]);
			sections[1] = {
				source: sections[1],
				frontmatter: true,
				data,
			};
		} catch(e) {
			// If it's not yaml in a frontmatter then do nothign
		}
	}

	sections = sections.map(section => {
		if(typeof section == "string") {
			return {
				frontmatter: false,
				source: section,
			}
		} else {
			return section;
		}
	});

	//console.log(sections)

	return {
		filePath,
		sections,
	}
};

const serialize = (doc) => {
	// Map over objects doc.sections
	//  - turn frontmatter and mdx back to markdown
	// join on newline
	// return markdown text
}

// doc.merge(doc2);
// doc.section[0].isFrontmatter?
// doc.section.add
// doc.section.remove
// doc.section[].

const openDocument = async (filePath) => {
	try {
		const file = await fs.promises.readFile(filePath);
		return parse("" + file, filePath);
	} catch(e) {
		console.error(e);
	}
}

module.exports = {
	parse,
	serialize,
	openDocument,
};
