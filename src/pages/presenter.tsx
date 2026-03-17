import { useState, useEffect } from 'react';
import FittedSlide from '../components/fitted-slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import DrawingOverlay from '../components/drawing-overlay';
// Shows a bar at the bottom of the presentation giving a hint on how far in the presentation you are
const StatusIndicator = ({ doc, currentSlide }) => {
	const max = doc.sections.length - 1;
	const progress = currentSlide / max * 100;

	return <div className={ styles.statusIndicator }>
		<div className={ styles.statusIndicatorProgress } style={{ width: `${progress}vw` }} />
	</div>
}

const Timer = () => {
	const currentTime = () => (new Date()).getTime();
	const [ timerStartedAt, setStart ] = useState(currentTime());
	const [ time, setTime ] = useState(0);

	// stolen from: https://stackoverflow.com/a/63704355
	const formatDuration = totalSeconds => {
		  const hours = Math.floor(totalSeconds / 3600)
		  const minutes = Math.floor((totalSeconds % 3600) / 60)
		  const seconds = totalSeconds - hours * 3600 - minutes * 60

		  return [`${hours}h`, `${minutes}m`, `${seconds}s`]
		    .filter(item => item[0] !== '0')
		    .join(' ')
	}

	useEffect(() => {
		const id = setInterval(() => {
			const newTime = Math.floor((currentTime() - timerStartedAt) / 1000);
			setTime(newTime);
		}, 1000);
		return () => clearInterval(id);
	}, [timerStartedAt]);

	const resetTime = () => {
		setStart(currentTime());
	};

	return <div style={{ fontSize: '3rem' }}>
		<span>Timer {formatDuration(time)} since start </span>
		<button onClick={resetTime}>Reset</button>
	</div>
}

const Presenter = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides({ hashRouting: true, syncPresentation: true });
	const [drawMode, setDrawMode] = useState(false);
	const [drawColor, setDrawColor] = useState('red');

	const drawColors = [
		{ name: 'Red', value: '#ff4444' },
		{ name: 'Blue', value: '#4488ff' },
		{ name: 'Green', value: '#44cc44' },
		{ name: 'Yellow', value: '#ffcc00' },
		{ name: 'White', value: '#ffffff' },
		{ name: 'Orange', value: '#ff8800' },
	];

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

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!doc) return <div>No document loaded</div>;

	const slideDrawings = (doc as any).drawings?.[currentSlide];

	return <div className={styles.present} style={{ touchAction: drawMode ? 'none' : 'auto', display: 'flex', flexDirection: 'column' }}>
		<CMDK>
			<Command.Item onSelect={openOverview}>Open overview</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
			<Command.Item onSelect={() => setDrawMode(d => !d)}>Toggle drawing {drawMode ? '(on)' : '(off)'}</Command.Item>
			<Command.Item onSelect={() => fetch('/doc/drawing/clear', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: currentSlide }),
			})}>Clear drawings</Command.Item>
		</CMDK>

		<div style={{ display: 'flex', flexDirection: 'row', gap: '0.5em', padding: '0.5em', flex: 1, minHeight: 0 }}>
			<div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
				<h2 style={{ margin: '0 0 0.25em' }}> Current </h2>
				<FittedSlide
					fonts={doc.frontmatter.fonts}
					overlay={<DrawingOverlay slideIndex={currentSlide} strokes={slideDrawings} enabled={drawMode} color={drawColor} />}
				>{doc.sections[currentSlide]?.source}</FittedSlide>
			</div>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
				<h2 style={{ margin: '0 0 0.25em' }}> Next </h2>
				<FittedSlide fonts={doc.frontmatter.fonts}>{doc.sections[currentSlide + 1]?.source}</FittedSlide>

				<Timer />

				<div style={{ marginTop: '1em' }}>
					<button
						onClick={() => setDrawMode(d => !d)}
						style={{ padding: '6px 12px', marginRight: '8px', background: drawMode ? '#444' : '#eee', color: drawMode ? 'white' : 'black', border: '1px solid #999', borderRadius: '4px', cursor: 'pointer' }}
					>{drawMode ? 'Drawing ON' : 'Drawing OFF'}</button>
					<button
						onClick={() => fetch('/doc/drawing/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slide: currentSlide }) })}
						style={{ padding: '6px 12px', marginRight: '16px', border: '1px solid #999', borderRadius: '4px', cursor: 'pointer' }}
					>Clear</button>
					{drawColors.map(c => (
						<button
							key={c.value}
							onClick={() => { setDrawColor(c.value); setDrawMode(true); }}
							title={c.name}
							style={{
								width: 28, height: 28,
								borderRadius: '50%',
								background: c.value,
								border: drawColor === c.value ? '3px solid white' : '2px solid #666',
								cursor: 'pointer',
								marginRight: 4,
								boxShadow: drawColor === c.value ? '0 0 4px rgba(0,0,0,0.5)' : 'none',
							}}
						/>
					))}
				</div>
			</div>
		</div>
	</div>;
}

export default Presenter;
