import {
	createThemeContract,
	createTheme,
	style,
	globalStyle,
} from '@vanilla-extract/css';

// Inspired by https://github.com/pacocoursey/cmdk/blob/main/website/styles/cmdk/vercel.scss

const gray1  = 'hsl(0, 0%, 99%)';
const grayA3 = 'hsla(0, 0%, 0%, 0.047)';
const gray4  = 'hsl(0, 0%, 93%)';
const gray5  = 'hsl(0, 0%, 90.9%)';
const gray6  = 'hsl(0, 0%, 88.7%)';
const gray8  = 'hsl(0, 0%, 78%)';
const gray9  = 'hsl(0, 0%, 56.1%)';
const gray11 = 'hsl(0, 0%, 43.5%)';
const gray12 = 'hsl(0, 0%, 9%)';

const fontSans = `'Inter', --apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif`;
const cmdkShadow = `0 16px 70px rgb(0 0 0 / 20%)`;
const appBg = gray1;

export const cmdk = style({
	position: 'fixed',
	zIndex: 100,
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
});

globalStyle(`${cmdk} [cmdk-root]`, {
	maxWidth: '640px',
	width: '100%',
	padding: '8px',
	background: '#ffffff',
	borderRadius: '12px',
	overflow: 'hidden',
	fontFamily: fontSans,
	border: `1px solid ${gray6}`,
	boxShadow: cmdkShadow,
	transition: 'transform 100ms ease',
});

globalStyle(`${cmdk} [cmdk-root] .dark &`, {
	background: 'rgba(22, 22, 22, 0.7)',
});

globalStyle(`${cmdk} [cmdk-input]`, {
	fontFamily: fontSans,
	border: 'none',
	width: '100%',
	fontSize: '17px',
	padding: '8px 8px 16px 8px',
	outline: 'none',
	background: appBg,
	color: gray12,
	borderBottom: `1px solid ${gray6}`,
	marginBottom: '16px',
	borderRadius: '0',
});

globalStyle(`${cmdk} [cmdk-input]::placeholder`, {
	color: gray9,
});

globalStyle(`${cmdk} [cmdk-item]`, {
	contentVisibility: 'auto',
	cursor: 'pointer',
	height: '48px',
	borderRadius: '8px',
	fontSize: '14px',
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	padding: '0 16px',
	color: gray11,
	userSelect: 'none',
	willChange: 'background, color',
	transition: 'all 150ms ease',
	transitionProperty: 'none',
});

globalStyle(`${cmdk} [cmdk-item][aria-selected='true']`, {
	background: grayA3,
	color: gray12,
});

globalStyle(`${cmdk} [cmdk-item][aria-disabled='true']`, {
	color: gray8,
	cursor: 'not-allowed',
});

globalStyle(`${cmdk} [cmdk-item]:active`, {
	transitionProperty: 'background',
	background: gray4,
});

globalStyle(`${cmdk} [cmdk-item] + [cmdk-item]`, {
	marginTop: '4px',
});

globalStyle(`${cmdk} [cmdk-item] svg`, {
	width: '18px',
	height: '18px',
});

globalStyle(`${cmdk} [cmdk-list]`, {
	height: 'min(330px, calc(var(--cmdk-list-height)))',
	maxHeight: '400px',
	overflow: 'auto',
	overscrollBehavior: 'contain',
	transition: '100ms ease',
	transitionProperty: 'height',
});

globalStyle(`${cmdk} [cmdk-vercel-shortcuts]`,  {
	display: 'flex',
	marginLeft: 'auto',
	gap: '8px',
});

globalStyle(`${cmdk} [cmdk-vercel-shortcuts] kbd`, {
	fontFamily: fontSans,
	fontSize: '12px',
	minWidth: '20px',
	padding: '4px',
	height: '20px',
	borderRadius: '4px',
	color: gray11,
	background: gray4,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	textTransform: 'uppercase',
});

globalStyle(`${cmdk} [cmdk-separator]`, {
	height: '1px',
	width: '100%',
	background: gray5,
	margin: '4px 0',
});

globalStyle(`${cmdk} *:not([hidden]) + [cmdk-group]`, {
	marginTop: '8px',
});

globalStyle(`${cmdk} [cmdk-group-heading]`, {
	userSelect: 'none',
	fontSize: '12px',
	color: gray11,
	padding: '0 8px',
	display: 'flex',
	alignItems: 'center',
	marginBottom: '8px',
});

globalStyle(`${cmdk} [cmdk-empty]`, {
	fontSize: '14px',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	height: '48px',
	whiteSpace: 'pre-wrap',
	color: gray11,
});
