import { useState } from 'react';
import Slide from '../slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import DrawingOverlay from '../components/drawing-overlay';

const openFullscreen = () => {
	const elem = document.documentElement as any;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

// Shows a bar at the bottom of the presentation giving a hint on how far in the presentation you are
const StatusIndicator = ({ doc, currentSlide }) => {
	const max = doc.sections.length - 1;
	const progress = currentSlide / max * 100;

	return <div className={ styles.statusIndicator }>
		<div className={ styles.statusIndicatorProgress } style={{ width: `${progress}vw` }} />
	</div>
}

const Present = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides({ hashRouting: true, syncPresentation: true });
	const [drawMode, setDrawMode] = useState(false);

	useKeybindings({
		'ArrowRight': next,
		'ArrowLeft': prev,
		'd': () => setDrawMode(d => !d),
		'c': () => fetch('/doc/drawing/clear', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slide: currentSlide }),
		}),
	});

	const openOverview = () => {
		window.location.pathname = "/";
	}
	const openForPrint = () => {
		window.location.pathname = "/print";
	}
	const openPresenterView = () => {
		window.open('/presenter', 'presenterview', 'popup');
	}

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!doc) return <div>No document loaded</div>;

	const slideDrawings = (doc as any).drawings?.[currentSlide];

	return <div className={styles.present} style={{ position: 'relative' }}>
		<CMDK>
			<Command.Item onSelect={openOverview}>Open overview</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
			<Command.Item onSelect={openPresenterView}>Open presenter view</Command.Item>
			<Command.Item onSelect={openFullscreen}>Fullscreen</Command.Item>
			<Command.Item onSelect={() => setDrawMode(d => !d)}>Toggle drawing {drawMode ? '(on)' : '(off)'}</Command.Item>
			<Command.Item onSelect={() => fetch('/doc/drawing/clear', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: currentSlide }),
			})}>Clear drawings</Command.Item>
		</CMDK>

		<Slide style={{ width: '100%', height: '100%', overflow: 'hidden' }} fonts={doc.frontmatter.fonts} cornerImage={doc.frontmatter.cornerImage}>{doc.sections[currentSlide]?.source}</Slide>
		<DrawingOverlay slideIndex={currentSlide} strokes={slideDrawings} enabled={drawMode} />
		<StatusIndicator doc={doc} currentSlide={currentSlide} />
	</div>;
}

export default Present;
