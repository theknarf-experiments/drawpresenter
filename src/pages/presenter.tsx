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
	const pad = (n: number) => String(n).padStart(2, '0');

	const formatDuration = (totalSeconds: number) => {
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
		return `${minutes}:${pad(seconds)}`;
	};

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

	return <div style={{
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		margin: '0.75em 0',
		padding: '0.75em 1em',
		background: '#1a1a2e',
		borderRadius: '8px',
	}}>
		<span style={{
			fontFamily: 'monospace',
			fontSize: '2rem',
			fontWeight: 'bold',
			color: time > 2700 ? '#ff4444' : time > 1800 ? '#ffcc00' : '#44cc44',
		}}>{formatDuration(time)}</span>
		<button onClick={resetTime} style={{
			padding: '8px 16px',
			border: '1px solid #555',
			borderRadius: '6px',
			cursor: 'pointer',
			fontSize: '1rem',
			background: '#333',
			color: 'white',
		}}>Reset</button>
	</div>
}

const Presenter = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides({ hashRouting: true, syncPresentation: true });
	const [drawMode, setDrawMode] = useState(false);
	const [drawColor, setDrawColor] = useState('red');
	const [brushSize, setBrushSize] = useState(2);

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

				<FittedSlide
					fonts={doc.frontmatter.fonts} cornerImage={doc.frontmatter.cornerImage}
					overlay={<DrawingOverlay slideIndex={currentSlide} strokes={slideDrawings} enabled={drawMode} color={drawColor} size={brushSize} />}
				>{doc.sections[currentSlide]?.source}</FittedSlide>
			</div>
			<div style={{ width: '33%', display: 'flex', flexDirection: 'column', minWidth: 0, flexShrink: 0 }}>

				<div style={{ aspectRatio: '16/9', maxHeight: '30vh' }}>
					<FittedSlide fonts={doc.frontmatter.fonts} cornerImage={doc.frontmatter.cornerImage}>{doc.sections[currentSlide + 1]?.source}</FittedSlide>
				</div>

				<div style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					margin: '0.75em 0',
					padding: '0.75em 1em',
					background: '#2a1e2a',
					borderRadius: '8px',
				}}>
					<button onClick={prev} style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Prev</button>
					<span style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: 'white' }}>{currentSlide + 1} / {doc.sections.length}</span>
					<button onClick={next} style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}>Next</button>
				</div>

				<Timer />

				<div style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5em',
					margin: '0.75em 0',
					padding: '0.75em 1em',
					background: '#1e2a1e',
					borderRadius: '8px',
					flexWrap: 'wrap',
				}}>
					<button
						onClick={() => setDrawMode(d => !d)}
						style={{ padding: '8px 16px', background: drawMode ? '#555' : '#333', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
					>{drawMode ? 'Drawing ON' : 'Drawing OFF'}</button>
					<button
						onClick={() => fetch('/doc/drawing/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slide: currentSlide }) })}
						style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem' }}
					>Clear</button>
					<div style={{ display: 'flex', gap: '6px', marginLeft: '0.5em' }}>
					{drawColors.map(c => (
						<button
							key={c.value}
							onClick={() => { setDrawColor(c.value); setDrawMode(true); }}
							title={c.name}
							style={{
								width: 32, height: 32,
								borderRadius: '50%',
								background: c.value,
								border: drawColor === c.value ? '3px solid white' : '2px solid #555',
								cursor: 'pointer',
								boxShadow: drawColor === c.value ? '0 0 6px rgba(255,255,255,0.3)' : 'none',
							}}
						/>
					))}
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginLeft: 'auto' }}>
						<input
							type="range"
							min={1}
							max={8}
							step={0.5}
							value={brushSize}
							onChange={(e) => setBrushSize(Number(e.target.value))}
							style={{ width: '80px', accentColor: drawColor }}
						/>
						<svg width="24" height="24" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r={brushSize * 1.5} fill={drawColor} opacity={0.8} />
						</svg>
					</div>
				</div>
			</div>
		</div>
	</div>;
}

export default Presenter;
