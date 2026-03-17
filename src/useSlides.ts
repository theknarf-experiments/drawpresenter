import { useReducer, useEffect, useRef } from 'react';
import { Document } from './document';
import useDoc from './useDoc';

export interface SlideActions {
  next: () => void;
  prev: () => void;
  goto: (value: number) => void;
}

interface UseSlidesConfig {
  hashRouting?: boolean;
  syncPresentation?: boolean;
}

const useSlides = (config: UseSlidesConfig = {}): [number, SlideActions, Document | undefined, boolean, Error | null] => {
	const [doc, isLoading, error] = useDoc();

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

	// Sync presentation slide from server via SSE
	useEffect(() => {
		if (!config?.syncPresentation || !doc) return;
		const serverSlide = (doc as any).presentationSlide;
		if (typeof serverSlide === 'number' && serverSlide !== state) {
			dispatch({ type: 'goto', value: serverSlide });
		}
	}, [config?.syncPresentation, (doc as any)?.presentationSlide]);

	// Post slide changes to server when syncing
	const syncedNext = () => {
		const newSlide = clamp(state + 1, 0, max);
		dispatch({ type: 'next' });
		if (config?.syncPresentation) {
			fetch('/doc/slide', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: newSlide }),
			});
		}
	};

	const syncedPrev = () => {
		const newSlide = clamp(state - 1, 0, max);
		dispatch({ type: 'prev' });
		if (config?.syncPresentation) {
			fetch('/doc/slide', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: newSlide }),
			});
		}
	};

	const syncedGoto = (value: number) => {
		dispatch({ type: 'goto', value });
		if (config?.syncPresentation) {
			fetch('/doc/slide', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: clamp(value, 0, max) }),
			});
		}
	};

	return [
		state,
		{
			next: config?.syncPresentation ? syncedNext : () => dispatch({ type: 'next' }),
			prev: config?.syncPresentation ? syncedPrev : () => dispatch({ type: 'prev' }),
			goto: config?.syncPresentation ? syncedGoto : (value) => dispatch({ type: 'goto', value }),
		},
		doc,
		isLoading,
		error,
	];
}

export default useSlides;
