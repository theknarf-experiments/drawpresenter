import { useState, useEffect } from 'react';
import Slide from '../slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import { useBroadcast, useBroadcastListen } from '../useBroadcast';

const openFullscreen = () => {
	const elem = document.documentElement;
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
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides({ hashRouting: true });
	useKeybindings({
		'ArrowRight': next,
		'ArrowLeft': prev,
	});
	const [ channel ] = useBroadcast('presenter');
	useBroadcastListen(channel, (e) => {
		if(e.data !== null) {
			goto(e.data)
		};
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

	return <div className={styles.present}>
		<CMDK>
			<Command.Item onSelect={openOverview}>Open overview</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
			<Command.Item onSelect={openPresenterView}>Open presenter view</Command.Item>
			<Command.Item onSelect={openFullscreen}>Fullscreen</Command.Item>
		</CMDK>

		<Slide style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{doc.sections[currentSlide]?.source}</Slide>
		<StatusIndicator doc={doc} currentSlide={currentSlide} />
	</div>;
}

export default Present;
