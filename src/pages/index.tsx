import { useRef, useEffect } from 'react';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import Slide from '../slide';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';

const Preview = ({ children }) => {
	return <div style={{
		width: 256, height: 144,
		overflow: 'hidden',
		border: '1px solid black',
		margin: 5,
	}}>
		<div style={{
			transform: 'scale(0.2)',
			transformOrigin: 'top left',
			width: 1280, height: 720,
		}}>
			<Slide style={{ width: 1280, height: 720, fontSize: '14px' }}>{children}</Slide>
		</div>
	</div>;
}

const HomePage = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides();
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

	return <div className={styles.present}>
		<CMDK>
			<Command.Item onSelect={startPresentation}>Start presentation</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
		</CMDK>
		<div className={styles.container}>
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
		<div className={styles.container}>
			<button onClick={prev}>Prev</button>
			<span>{currentSlide}</span>
			<button onClick={next}>Next</button>
		</div>
	</div>;
}

export default HomePage;
