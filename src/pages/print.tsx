import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Slide from '../slide';
import styles from '../app.module.css';

const Present = () => {
	const { data: doc, isLoading, error } = useQuery({
		queryKey: ['doc'],
		queryFn: () => fetch('/doc').then(res => res.json()).then(data => data.doc)
	});

	useEffect(() => {
		if (doc?.frontmatter?.colors) {
			Object.entries(doc.frontmatter.colors).forEach(([key, value]) => {
				document.documentElement.style.setProperty(`--${key}`, String(value));
			});
		}
	}, [doc]);

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {(error as Error).message}</div>;
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
