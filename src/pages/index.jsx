import { useState, useMemo } from 'react';
import { openDocument } from '../document';
import MDX from '@mdx-js/runtime';

export async function getServerSideProps(context) {
	const doc = await openDocument(process.env.projectFile);

  return {
    props: {
			doc,
		},
  }
}

const HomePage = ({ doc }) => {
	console.log(doc);
	const [ currentSlide, setSlide ] = useState(2);

  return <div>
		<div>Opening file { doc.filePath }</div>
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<div style={{ margin: '10px', padding: '10px', border: '1px solid black' }}>
			{
				doc.sections.map((section, i) => (
					<div key={`section-${i}`}>{section.source}</div>
				))
			}
			</div>
			<div style={{ margin: '10px', padding: '10px', border: '1px solid black' }}>
				<MDX>{doc.sections[currentSlide]?.source}</MDX>
			</div>
		</div>
		<div>
			<button onClick={() => setSlide((nr) => nr-1)}>Prev</button>
			<span>{currentSlide}</span>
			<button onClick={() => setSlide((nr) => nr+1)}>Next</button>
		</div>
	</div>;
}

export default HomePage;
