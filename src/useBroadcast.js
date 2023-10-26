import { useState, useEffect } from 'react';

export const useBroadcast = (channelName) => {
	const [ channel, setChannel ] = useState(null);

	useEffect(() => {
		if(channel == null) {
			const channel = new BroadcastChannel(channelName);
			setChannel(channel);
		}
	}, []);

	return [channel];
};

export const useBroadcastListen = (channel, callback) => {
	useEffect(() => {
		if(channel === null) return;

		const internalCallback = (e) => {
			callback(e);
		};
		channel.addEventListener('message', internalCallback);
		return () => channel.removeEventListener('message', internalCallback);
	}, [channel, callback]);
};
