import { useEffect, useRef } from 'react';

const useKeybindings = (keybindings) => {
	const ref = useRef(keybindings);
	ref.current = keybindings;

	useEffect(() => {
		const eventListener = (e) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target as HTMLElement)?.isContentEditable)
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
