import MDX from '@mdx-js/runtime';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { slide, innerSlide } from './app.css.ts';

const code = ({ className, ...props}) => {
	const match = /language-(\w+)/.exec(className || '')
	if(match) {
		return <div style={{ fontSize: '1.8rem' }}>
			<SyntaxHighlighter showLineNumbers={true} style={a11yDark} language={match[1]} PreTag="div" {...props} />
		</div>
	} else {
		return <code className={className} {...props} />
	}
}

const img = ({ src, ...props }) => {
	const newSrc = src.replace(/^\./, '/files/');

	return <img
		src={newSrc}
		{...props}
		/>
}

const MDXComponents = {
	code,
	img
}

const Slide = ({ children, style }) => {
	return <div style={style} className={slide}>
		<div className={innerSlide}>
			<MDX components={MDXComponents}>{children}</MDX>
		</div>
	</div>
}

export default Slide;
