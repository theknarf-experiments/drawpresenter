import { useState, useReducer, useMemo, useRef, useEffect } from 'react';

const useKeybindings = (keybindings) => {
	useEffect(() => {
		const eventListener = (e) => {
			if(typeof keybindings[e.key] == 'function')
				keybindings[e.key](e);

			if(typeof keybindings['all'] == 'function')
				keybindings['all'](e);
		};

		document.addEventListener('keyup', eventListener);
		return () => document.removeEventListener('keyup', eventListener);
	}, []);
}

export default useKeybindings;
