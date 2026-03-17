import React, { useEffect, useState, createContext, useContext, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

class Mermaid extends React.Component<{ children: React.ReactNode }> {
  componentDidMount() {
    mermaid.contentLoaded();
  }
  render() {
    return <div className="mermaid">{this.props.children}</div>;
  }
}


const code = ({ className, children, ...props }: { className?: string; children: string; [key: string]: any }) => {
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

const img = ({ src, ...props }: { src: string; [key: string]: any }) => {
	let newSrc = src;
	if (!src.startsWith('http') && !src.startsWith('/')) {
		newSrc = '/files/' + src;
	}

	return <img
		src={newSrc}
		{...props}
		/>
}

const RevealContext = createContext<{ currentReveal: number } | null>(null);

const useReveal = (currentId: number) => {
	const context = useContext(RevealContext);
	const show = context ? context.currentReveal >= currentId : false;

	//console.log(`currentReveal: ${context?.currentReveal}, currentId: ${currentId}, show: ${show}`);

	return [show];
}

const Reveal = ({ children, currentId, style }: { children: React.ReactNode; currentId: number; style?: React.CSSProperties }) => {
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

const InnerSlide = memo(({ children, components }: { children: string; components?: Record<string, any> }) => {
  const [ MDX, setMDX ] = useState<React.ReactElement | null>(null);

  const mergedComponents = components ? { ...MDXComponents, ...components } : MDXComponents;

  useEffect(() => {
  (async () => {
    // @ts-ignore
    const { default: MDX } = await evaluate(children, runtime);
    const content = MDX({ components: mergedComponents });

    setMDX(content);
  })();
}, [children, components]);

 	return <div className="innerSlide">
    {MDX}
	</div>;
});

export interface SlideProps {
  children: string;
  style?: React.CSSProperties;
  components?: Record<string, any>;
  font?: string;
}

const Slide = ({ children, style, components, font }: SlideProps) => {
	useEffect(() => {
		if(typeof window !== "undefined") {
			window.confetti = confetti;
		}
	}, []);

	const [currentReveal, setCurrentReveal] = useState(0);

	useEffect(() => {
		const eventListener = (e: KeyboardEvent) => {
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
		<div style={style} className="slide">
			{font && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700&display=swap`} precedence="default" />}
			<RevealContext.Provider value={{
				currentReveal,
			}}>
				<InnerSlide components={components}>{children}</InnerSlide>
			</RevealContext.Provider>
		</div>
	);
}

export default Slide;
