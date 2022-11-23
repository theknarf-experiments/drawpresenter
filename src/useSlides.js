import { useReducer } from 'react';

const useSlides = (doc) => {
	const max = doc.sections.length - 1;
	const clamp = (value, min, max) => {
		return Math.min(Math.max(value, min), max);
	};

	const [state, dispatch] = useReducer((state, action) => {
		if(action.type == 'next') {
			return clamp(state + 1, 0, max);
		} else if(action.type == 'prev') {
			return clamp(state - 1, 0, max);
		} else if(action.type == 'goto') {
			return clamp(action.value, 0, max);
		}

		return state;
	}, 0);

	return [
		state,
		{
			next: () => dispatch({ type: 'next' }),
			prev: () => dispatch({ type: 'prev' }),
			goto: (value) => dispatch({ type: 'goto', value }),
		}
	];
}

export default useSlides;
