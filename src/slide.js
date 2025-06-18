import React, { useEffect, useState, createContext, useContext, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { slide, innerSlide } from './app.css.ts';
import mermaid from 'mermaid';
import confetti from 'canvas-confetti';
import { Tweet } from "mdx-embed/dist/components/twitter";
import useKeybindings from './useKeybindings';
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
});

class Mermaid extends React.Component {
  componentDidMount() {
    mermaid.contentLoaded();
  }
  render() {
    return <div className="mermaid">{this.props.children}</div>;
  }
}


const code = ({ className, children, ...props}) => {
	const match = /language-(\w+)/.exec(className || '');

	// Remove extra newlines in the beginnign or end
	const code = children.replace(/^\n|\n$/g, '');

	if(match && match[1] == "mermaid") {
		return <Mermaid>{code}</Mermaid>;
	}

	if(match) {
		return <div style={{ fontSize: '1.8rem' }}>
			<SyntaxHighlighter showLineNumbers={true} style={a11yDark} language={match[1]} PreTag="div" {...props}>{code}</SyntaxHighlighter>
		</div>
	} else {
		return <code className={className} {...props}>{code}</code>
	}
}

const img = ({ src, ...props }) => {
	const newSrc = src.replace(/^\./, '/files/');

	return <img
		src={newSrc}
		{...props}
		/>
}

const RevealContext = createContext(null);

const useReveal = (currentId) => {
	const { currentReveal} = useContext(RevealContext);
	const show = currentReveal >= currentId;

	//console.log(`currentReveal: ${currentReveal}, currentId: ${currentId}, show: ${show}`);

	return [show];
}

const Reveal = ({ children, currentId, style }) => {
	const [show] = useReveal(currentId);

	return <span style={{
		opacity: show ? '100%' : '0%',
		transition: 'opacity 0.4s',
		...(style || {}),
	}}>{children}</span>;
};

const MDXComponents = {
	code,
	img,
	Tweet,
	Reveal,
};

const InnerSlide = memo(({ children }) => {
  const [ MDX, setMDX ] = useState(null);

 useEffect(() => {
  (async () => {
    const { default: MDX } = await evaluate(children, runtime);
    const content = MDX({
      components: {
        MDXComponents
      }
    });

    setMDX(content);
  })();
 }, [children]);

	return <div className={innerSlide}>
    {MDX}
	</div>;
});

const Slide = ({ children, style }) => {
	useEffect(() => {
		if(typeof window !== "undefined") {
			window.confetti = confetti;
		}
	}, []);

	const [currentReveal, setCurrentReveal] = useState(0);

	useEffect(() => {
		const eventListener = (e) => {
			if(e.key === 'ArrowUp') {
				setCurrentReveal(c => (c - 1) > 0 ? c - 1 : 0);
			} else if (e.key === 'ArrowDown') {
				setCurrentReveal(c => c + 1);
			}
		};

		document.addEventListener('keyup', eventListener);
		return () => document.removeEventListener('keyup', eventListener);
	}, []);

	return (
		<div style={style} className={slide}>
			<RevealContext.Provider value={{
				currentReveal,
			}}>
				<InnerSlide>{children}</InnerSlide>
			</RevealContext.Provider>
		</div>
	);
}

export default Slide;
