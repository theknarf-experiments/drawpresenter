import { openDocument } from '../document';
import Slide from '../slide';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import { statusIndicator, statusIndicatorProgress, themeA, print } from '../app.css.ts';

export async function getServerSideProps(context) {
	const doc = await openDocument(process.env.projectFile);

  return {
    props: {
			doc,
		},
  }
}

const Present = ({ doc }) => {
	return <div>
		{
			doc.sections.map((section, i) => (
				<div className={`${themeA} ${print}`} key={`section-${i}`}>
					<Slide style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{section.source}</Slide>
					<div style={{ pageBreakAfter: 'always' }}></div>
				</div>
			))
		}
	</div>;
}

export default Present;
