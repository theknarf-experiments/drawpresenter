import MDX from '@mdx-js/runtime';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const code = ({ className, ...props}) => {
	const match = /language-(\w+)/.exec(className || '')
	return match
		? <SyntaxHighlighter showLineNumbers={true} style={a11yDark} language={match[1]} PreTag="div" {...props} />
		: <code className={className} {...props} />
}

const Slide = ({ children }) => {
	return <div style={{ width: '1280px', height: '720px' }}>
		<MDX components={{ code }}>{children}</MDX>
	</div>
}

export default Slide;
