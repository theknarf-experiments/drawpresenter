import { useState, useReducer, useMemo, useRef, useEffect } from 'react';
import { openDocument } from '../document';
import MDX from '@mdx-js/runtime';
import html2canvas from 'html2canvas';
import useSlides from '../useSlides';
import { container } from '../app.css.ts';
import SyntaxHighlighter from 'react-syntax-highlighter'
import { agate } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

export async function getServerSideProps(context) {
	const doc = await openDocument(process.env.projectFile);

  return {
    props: {
			doc,
		},
  }
}

const code = ({ className, ...props}) => {
	const match = /language-(\w+)/.exec(className || '')
	return match
		? <SyntaxHighlighter showLineNumbers={true} style={agate} language={match[1]} PreTag="div" {...props} />
		: <code className={className} {...props} />
}

const Slide = ({ children }) => {
	return <div style={{ width: '1280px', height: '720px' }}>
		<MDX components={{ code }}>{children}</MDX>
	</div>
}

const Preview = ({ children }) => {
	const ref = useRef(null);
	const refTarget = useRef(null);

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
				if(refTarget.current?.hasChildNodes()) {
					refTarget.current?.removeChild(
						refTarget.current.children[0]
					);
				}

				refTarget.current?.appendChild(canvas);
			});
		}
	}, [ref, refTarget])

	return <div>
		<div style={{ opacity: 0, position: 'fixed', pointerEvents: 'none' }}>
			<div ref={ref}>
				<Slide>{children}</Slide>
			</div>
		</div>
		<div
			style={{ border: '1px solid black', padding: '5px', margin: '5px' }}
			ref={refTarget}
		></div>
	</div>;
}

const useKeybindings = (keybindings) => {
	useEffect(() => {
		const eventListener = (e) => {
			if(typeof keybindings[e.key] == 'function')
				keybindings[e.key](e);

			if(typeof keybindings['all'] == 'function')
				keybindings['all'](e);
		};

		document.addEventListener('keyup', eventListener);
		return () => document.removeEventListener('keyup', eventListener);
	}, []);
}

const HomePage = ({ doc }) => {
	const [ currentSlide, { next, prev, goto } ] = useSlides(doc);
	useKeybindings({
		'ArrowDown': next,
		'ArrowRight': next,
		'ArrowUp': prev,
		'ArrowLeft': prev,
	});

	//console.log(doc);

  return <div>
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<div style={{ margin: '10px', border: '1px solid black', overflow: 'scroll', height: '765px' }}>
			{
				doc.sections.map((section, i) => (
					<div style={{ display: 'flex' }} key={`section-${i}`} onClick={() => goto(i)}>
						<span>{i}</span>
						<Preview>{section.source}</Preview>
					</div>
				))
			}
			</div>
			<div style={{ margin: '10px', padding: '10px', border: '1px solid black' }}>
				<Slide>{doc.sections[currentSlide]?.source}</Slide>
			</div>
		</div>
		<div className={container}>
			<button onClick={prev}>Prev</button>
			<span>{currentSlide}</span>
			<button onClick={next}>Next</button>
		</div>
	</div>;
}

export default HomePage;
