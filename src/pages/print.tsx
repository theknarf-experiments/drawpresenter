import Slide from '../slide';
import styles from '../app.module.css';
import useDoc from '../useDoc';

const Present = () => {
	const [doc, isLoading, error] = useDoc();

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!doc) return <div>No document loaded</div>;
	return <div>
		{
			doc.sections.map((section, i) => (
				<div className={styles.print} key={`section-${i}`}>
					<Slide style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{section.source}</Slide>
					<div style={{ pageBreakAfter: 'always' }}></div>
				</div>
			))
		}
	</div>;
}

export default Present;
