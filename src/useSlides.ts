import { useReducer, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document } from './document';

export interface SlideActions {
  next: () => void;
  prev: () => void;
  goto: (value: number) => void;
}

interface UseSlidesConfig {
  hashRouting?: boolean;
}

const useSlides = (config: UseSlidesConfig = {}): [number, SlideActions, Document | undefined, boolean, Error | null] => {
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

	const max = doc && doc.sections ? doc.sections.length - 1 : 0;
	const clamp = (value: number, min: number, max: number): number => {
		return Math.min(Math.max(value, min), max);
	};

	interface Action {
		type: 'next' | 'prev' | 'goto';
		value?: number;
	}

	const [state, dispatch] = useReducer((state: number, action: Action): number => {
		let newState = state;
		if(action.type == 'next') {
			newState = clamp(state + 1, 0, max);
		} else if(action.type == 'prev') {
			newState = clamp(state - 1, 0, max);
		} else if(action.type == 'goto') {
			newState = clamp(action.value || 0, 0, max);
		}

		if(config?.hashRouting && typeof window !== "undefined") {
			if(newState !== state) {
				history.replaceState(null, '', `#${newState}`);
			}
		}

		return newState;
	}, 0);

	const hasInitializedFromHash = useRef(false);

	useEffect(() => {
		if (!config?.hashRouting) return;
		if (typeof window === "undefined") return;
		if (!doc) return;
		if (hasInitializedFromHash.current) return;

		const match = window.location.hash.match(/^#(?<num>\d+)$/);
		const rawValue = match?.groups?.num ? parseInt(match.groups.num, 10) : 0;
		hasInitializedFromHash.current = true;
		if (!Number.isNaN(rawValue)) {
			dispatch({ type: 'goto', value: rawValue });
		}
	}, [config?.hashRouting, doc]);
	
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
