import { useReducer, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const useSlides = (config = {}) => {
	const { data: doc, isLoading, error } = useQuery({
		queryKey: ['doc'],
		queryFn: () => fetch('/doc').then(res => res.json()).then(data => data.doc)
	});

	useEffect(() => {
		if (doc?.frontmatter?.colors) {
			Object.entries(doc.frontmatter.colors).forEach(([key, value]) => {
				document.documentElement.style.setProperty(`--${key}`, value);
			});
		}
	}, [doc]);

	const max = doc && doc.sections ? doc.sections.length - 1 : 0;
	const clamp = (value, min, max) => {
		return Math.min(Math.max(value, min), max);
	};

	const [state, dispatch] = useReducer((state, action) => {
		let newState = state;
		if(action.type == 'next') {
			newState = clamp(state + 1, 0, max);
		} else if(action.type == 'prev') {
			newState = clamp(state - 1, 0, max);
		} else if(action.type == 'goto') {
			newState = clamp(action.value, 0, max);
		}

		if(config?.hashRouting && typeof window !== "undefined") {
			if(newState !== state) {
				history.replaceState(null, null, `#${newState}`);
			}
		}

		return newState;
	}, 0);

	useEffect(() => {
		if(config?.hashRouting && typeof window !== "undefined") {
			const value = window.location.hash.match(/^#(?<num>.*)$/)?.groups?.num || 0;
			if(value !== 0) {
				dispatch({ type: 'goto', value })
			}
		}
	}, []);
	
	return [
		state,
		{
			next: () => dispatch({ type: 'next' }),
			prev: () => dispatch({ type: 'prev' }),
			goto: (value) => dispatch({ type: 'goto', value }),
		},
		doc,
		isLoading,
		error
	];
}

export default useSlides;
