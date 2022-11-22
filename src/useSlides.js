import { useReducer } from 'react';

const useSlides = (doc) => {
	const max = doc.sections.length - 1;

	const [state, dispatch] = useReducer((state, action) => {
		if(action.type == 'next') {
			return (state + 1) <= max ? (state + 1) : max;
		} else if(action.type == 'prev') {
			return (state - 1) >= 0 ? (state - 1) : 0;
		} else if(action.type == 'goto') {
			return action.value;
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
