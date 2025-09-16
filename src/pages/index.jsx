import { useState, useReducer, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import { container } from '../app.css.ts';
import Slide from '../slide';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import { statusIndicator, statusIndicatorProgress, themeA, present } from '../app.css.ts';

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
				<Slide style={{ width: '15vw', height: '15vh', fontSize: '14px' }}>{children}</Slide>
			</div>
		</div>
		<div
			style={{ border: '1px solid black', padding: '5px', margin: '5px' }}
			ref={refTarget}
		></div>
	</div>;
}

const HomePage = () => {
	const { data: doc, isLoading, error } = useQuery({
		queryKey: ['doc'],
		queryFn: () => fetch('/doc').then(res => res.json()).then(data => data.doc)
	});

	const [ currentSlide, { next, prev, goto } ] = useSlides(doc);
	useKeybindings({
		'ArrowDown': next,
		'ArrowRight': next,
		'ArrowUp': prev,
		'ArrowLeft': prev,
	});

	const startPresentation = () => {
		window.location.pathname = "/present";
	}
	const openForPrint = () => {
		window.location.pathname = "/print";
	}

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!doc) return <div>No document loaded</div>;

	return <div className={`${themeA} ${present}`}>
		<CMDK>
			<Command.Item onSelect={startPresentation}>Start presentation</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
		</CMDK>
		<div className={container}>
			<a href="/present">Start presentation</a>&nbsp;
			<a href="/print">Open for print</a>&nbsp;
			<span>Hit cmd+k for more actions</span>
		</div>
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
				<Slide style={{ width: '60vw', height: '60vh' }}>{doc.sections[currentSlide]?.source}</Slide>
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
