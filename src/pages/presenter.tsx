import { useState, useEffect } from 'react';
import Slide from '../slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import { useBroadcast } from '../useBroadcast';

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
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides({ hashRouting: true });
	const [ channel ] = useBroadcast('presenter');

	useEffect(() => {
		if(channel !== null) {
			channel.postMessage(currentSlide);
		}
	}, [currentSlide]);

	useKeybindings({
		'ArrowRight': next,
		'ArrowLeft': prev,
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

	return <div className={styles.present}>
		<CMDK>
			<Command.Item onSelect={openOverview}>Open overview</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
		</CMDK>

		<div style={{ display: 'flex', flexDirection: 'row', gap: '3em', margin: '2em' }}>
			<div>
				<h2> Current </h2>
				<Slide style={{ width: '60vw', height: '60vh', fontSize: '18px', overflow: 'hidden' }}>{doc.sections[currentSlide]?.source}</Slide>
			</div>
			<div>
				<h2> Next </h2>
				<Slide style={{ width: '30vw', height: '30vh', fontSize: '10px', overflow: 'hidden' }}>{doc.sections[currentSlide + 1]?.source}</Slide>

				<Timer />
			</div>
		</div>
	</div>;
}

export default Presenter;
