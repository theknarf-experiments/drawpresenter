import { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

const sharedStyle: React.CSSProperties = {
	display: 'inline-block',
	padding: '4px 12px',
	border: '1px solid gray',
	borderRadius: '4px',
	background: '#f0f0f0',
	color: 'black',
	cursor: 'pointer',
	fontFamily: 'inherit',
	fontSize: 'inherit',
	textDecoration: 'none',
	lineHeight: '1.5',
	boxSizing: 'border-box',
};

export const Button = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return <button {...props} style={{ ...sharedStyle, ...props.style }} />;
};

export const LinkButton = (props: AnchorHTMLAttributes<HTMLAnchorElement>) => {
	return <a {...props} style={{ ...sharedStyle, ...props.style }} />;
};
