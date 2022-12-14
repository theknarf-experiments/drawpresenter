import {
  createThemeContract,
  createTheme,
  style,
	globalStyle,
} from '@vanilla-extract/css';

// Theming

export const vars = createThemeContract({
	color: {
		background: null,
		text: null,
		link: null,
	},
	font: {
		body: null,
	}
});

export const themeA = createTheme(vars, {
	color: {
		background: 'black',
		text: 'white',
		link: 'white',
	},
	font: {
		body: 'arial'
	}
});

// Components

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
	zIndex: 100,
});

export const statusIndicatorProgress = style({
	height: '100%',
	background: 'lightgrey',
	left: 0,
	transition: 'width 1s',
});

export const slide = style({
	backgroundColor: vars.color.background,
	color: vars.color.text,
	fontSize: '3rem',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
});

globalStyle(`${slide} a`, {
	color: vars.color.link,
});

export const innerSlide = style({
	width: '80vw',
});

export const present = style({
	margin: 0,
	padding: 0,
	width: '100vw',
	height: '100vh',
	position: 'fixed',
	left: 0,
	top: 0,
});

export const print = style({
	marginBottom: '5px',
	width: `${1280*1.45}px`,
	height: `${720*1.45}px`,
	colorAdjust: 'exact',
});
