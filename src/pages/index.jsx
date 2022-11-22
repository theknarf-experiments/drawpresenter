import { useState, useMemo, useRef, useEffect } from 'react';
import { openDocument } from '../document';
import MDX from '@mdx-js/runtime';
import html2canvas from 'html2canvas';

export async function getServerSideProps(context) {
	const doc = await openDocument(process.env.projectFile);

  return {
    props: {
			doc,
		},
  }
}

const Slide = ({ children }) => {
	return <div style={{ width: '1280px', height: '720px' }}>
		<MDX>{children}</MDX>
	</div>
}

const Preview = ({ i, children }) => {
	const ref = useRef(null);
	const refTarget = useRef(null);
	//const [previewCanvas, setPreviewCanvas] = useState(null);

	useEffect(() => {
		if(
			ref !== null &&
			ref?.current !== null &&
			refTarget !== null &&
			refTarget?.current !== null
		) {
			html2canvas(ref.current, {
				width: 1280 / 5,
				height: 720 / 5,
			}).then((canvas) => {
				if(refTarget.current.hasChildNodes()) {
					refTarget.current.removeChild(
						refTarget.current.children[0]
					);
				}

				refTarget.current.appendChild(canvas);
			});
		}
	}, [ref, refTarget])

	return <div>
		<div style={{ opacity: 0, position: 'fixed', pointerEvents: 'none' }}>
			<div ref={ref}>
				<Slide>{children}</Slide>
			</div>
		</div>
		<div style={{ border: '1px solid black', padding: '5px', margin: '5px' }} ref={refTarget}></div>
	</div>;
}

const HomePage = ({ doc }) => {
	console.log(doc);
	const [ currentSlide, setSlide ] = useState(0);
	//document.html2canvas = html2canvas;

  return <div>
		<div>Opening file { doc.filePath }</div>
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<div style={{ margin: '10px', padding: '10px', border: '1px solid black' }}>
			{
				doc.sections.map((section, i) => (
					<div key={`section-${i}`}><Preview i={i}>{section.source}</Preview></div>
				))
			}
			</div>
			<div style={{ margin: '10px', padding: '10px', border: '1px solid black' }}>
				<Slide>{doc.sections[currentSlide]?.source}</Slide>
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
