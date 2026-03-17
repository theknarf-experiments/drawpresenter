import { useState, useEffect, startTransition } from 'react';
import { Document } from './document';

const fetchDoc = (): Promise<Document> =>
	fetch('/doc').then(res => res.json()).then(data => data.doc);

const useDoc = (): [Document | undefined, boolean, Error | null] => {
	const [doc, setDoc] = useState<Document | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Initial fetch
	useEffect(() => {
		fetchDoc()
			.then((doc) => {
				setDoc(doc);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err);
				setIsLoading(false);
			});
	}, []);

	// Listen to SSE for document changes (server sends full doc in event data)
	useEffect(() => {
		const eventSource = new EventSource('/doc/events');
		eventSource.onmessage = (e) => {
			const newDoc: Document = JSON.parse(e.data);
			startTransition(() => {
				setDoc(prev => {
					// Skip if nothing changed (avoids unnecessary re-render from duplicate SSE events)
					if (prev && prev.sections.length === newDoc.sections.length &&
						prev.sections.every((s, i) => s.id === newDoc.sections[i].id && s.source === newDoc.sections[i].source) &&
						JSON.stringify(prev.frontmatter) === JSON.stringify(newDoc.frontmatter) &&
						(prev as any).history?.pointer === (newDoc as any).history?.pointer) {
						return prev;
					}
					return newDoc;
				});
			});
		};
		return () => eventSource.close();
	}, []);

	// Apply frontmatter colors
	useEffect(() => {
		if (doc?.frontmatter?.colors) {
			Object.entries(doc.frontmatter.colors).forEach(([key, value]) => {
				document.documentElement.style.setProperty(`--${key}`, String(value));
			});
		}
		if (doc?.frontmatter?.fonts?.heading) {
			document.documentElement.style.setProperty('--font-heading', doc.frontmatter.fonts.heading);
		}
		if (doc?.frontmatter?.fonts?.body) {
			document.documentElement.style.setProperty('--font-body', doc.frontmatter.fonts.body);
		}
	}, [doc]);

	return [doc, isLoading, error];
};

export default useDoc;
