import { openDocument } from '../document';
import Slide from '../slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import { statusIndicator, statusIndicatorProgress, themeA, present } from '../app.css.ts';

export async function getServerSideProps(context) {
	const doc = await openDocument(process.env.projectFile);

  return {
    props: {
			doc,
		},
  }
}

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

	return <div className={ statusIndicator }>
		<div className={ statusIndicatorProgress } style={{ width: `${progress}vw` }} />
	</div>
}

const Present = ({ doc }) => {
	const [ currentSlide, { next, prev, goto } ] = useSlides(doc, { hashRouting: true });
	useKeybindings({
		'ArrowDown': next,
		'ArrowRight': next,
		'ArrowUp': prev,
		'ArrowLeft': prev,
		'f': openFullscreen,
	});

	return <div className={`${themeA} ${present}`}>
		<Slide style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{doc.sections[currentSlide]?.source}</Slide>
		<StatusIndicator doc={doc} currentSlide={currentSlide} />
	</div>;
}

export default Present;
