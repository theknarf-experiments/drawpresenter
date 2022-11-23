import { style } from '@vanilla-extract/css';

export const container = style({
	padding: 10,
	background: 'lightgray',
});

export const statusIndicator = style({
	height: '1vh',
	position: 'fixed',
	bottom: 0,
	left: 0,
	right: 0,
});

export const statusIndicatorProgress = style({
	height: '100%',
	background: 'lightgrey',
	left: 0,
	transition: 'width 1s',
});
