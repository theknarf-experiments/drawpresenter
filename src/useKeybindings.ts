import { useEffect, useRef } from 'react';

const useKeybindings = (keybindings) => {
	const ref = useRef(keybindings);
	ref.current = keybindings;

	useEffect(() => {
		const eventListener = (e) => {
			const target = e.target as HTMLElement;
			const tag = target?.tagName;
			if (tag === 'TEXTAREA' || tag === 'INPUT' || target?.isContentEditable)
				return;
			// Skip elements that explicitly handle their own keyboard events
			if (target?.tabIndex >= 0 && tag !== 'BODY' && tag !== 'DIV')
				return;

			if(typeof ref.current[e.key] == 'function')
				ref.current[e.key](e);

			if(typeof ref.current['all'] == 'function')
				ref.current['all'](e);
		};

		document.addEventListener('keyup', eventListener);
		return () => document.removeEventListener('keyup', eventListener);
	}, []);
}

export default useKeybindings;
