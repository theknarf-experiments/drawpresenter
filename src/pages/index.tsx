import { useState, useEffect, useRef, ViewTransition } from 'react';
import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import Slide from '../slide';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import { Frontmatter } from '../document';
import { Button, LinkButton } from '../components/button';
import ContextMenu from '../components/context-menu';
import { parseMarkdown, serializeMarkdown } from '../mdast-utils';

const patchDoc = (operations: any[]) =>
	fetch('/doc', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(operations),
	});

const Preview = ({ children, fonts }: { children: string; fonts?: { heading?: string; body?: string } }) => {
	return <div className={styles.previewOuter}>
		<div className={styles.previewInner}>
			<Slide style={{ width: 1280, height: 720 }} fonts={fonts}>{children}</Slide>
		</div>
	</div>;
}

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
	return <label className={styles.colorInput}>
		<span>{label}</span>
		<input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
		<input type="text" value={value} onChange={(e) => onChange(e.target.value)}
			className={styles.colorInputText} />
	</label>;
}

const ThemeSettings = ({ frontmatter }: { frontmatter: Frontmatter }) => {
	const colors = frontmatter?.colors || {};

	const updateColor = async (key: string, value: string) => {
		const newFrontmatter = {
			...frontmatter,
			colors: { ...colors, [key]: value },
		};
		await fetch('/doc/frontmatter', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ frontmatter: newFrontmatter }),
		});
	};

	return <div className={styles.themeSettings}>
		<strong>Theme</strong>
		<ColorInput label="bg" value={colors.bg || '#000000'} onChange={(v) => updateColor('bg', v)} />
		<ColorInput label="text" value={colors.text || '#ffffff'} onChange={(v) => updateColor('text', v)} />
		<ColorInput label="link" value={colors.link || '#ffffff'} onChange={(v) => updateColor('link', v)} />
	</div>;
}

const SlideEditor = ({ source, slideIndex }: { source: string; slideIndex: number }) => {
	const [value, setValue] = useState(source);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setValue(source);
	}, [source]);

	const save = (newValue: string) => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			await fetch('/doc', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify([
					{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newValue },
				]),
			});
		}, 500);
	};

	const onChange = (newValue: string) => {
		setValue(newValue);
		save(newValue);
	};

	return <textarea
		value={value}
		onChange={(e) => onChange(e.target.value)}
		className={styles.slideEditor}
	/>;
}

interface EditableProps {
	tag: keyof JSX.IntrinsicElements;
	nodeType: string;
	nodeMatcher?: (node: any) => boolean;
	children: React.ReactNode;
	source: string;
	slideIndex: number;
}

// Recursively extract all text values from an AST node
const getNodeText = (node: any): string => {
	if (node.type === 'text') return node.value;
	if (node.children) return node.children.map(getNodeText).join('');
	return '';
};

// Walk AST depth-first, returning { node, parent, index } for the first match
const walkTree = (tree: any, matcher: (node: any) => boolean): { node: any; parent: any; index: number } | null => {
	const walk = (node: any, parent: any, index: number): { node: any; parent: any; index: number } | null => {
		if (matcher(node)) return { node, parent, index };
		if (node.children) {
			for (let i = 0; i < node.children.length; i++) {
				const result = walk(node.children[i], node, i);
				if (result) return result;
			}
		}
		return null;
	};
	return walk(tree, null, 0);
};

// Find the deepest text node inside a node
const findDeepText = (node: any): any | null => {
	if (node.type === 'text') return node;
	if (node.children) {
		for (const child of node.children) {
			const found = findDeepText(child);
			if (found) return found;
		}
	}
	return null;
};

const EditableElement = ({ tag: Tag, nodeType, nodeMatcher, children, source, slideIndex }: EditableProps) => {
	const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children);
	const ref = useRef<HTMLElement>(null);
	const [mode, setMode] = useState<'idle' | 'selected' | 'editing'>('idle');

	const matcher = nodeMatcher || ((node: any) => node.type === nodeType);
	// For elements that can appear multiple times (like li), match by text content
	const textMatcher = (node: any) => matcher(node) && getNodeText(node) === text;

	const findMatch = () => {
		const tree = parseMarkdown(source);
		// Try text-aware match first, fall back to type-only match
		const result = walkTree(tree, textMatcher) || walkTree(tree, matcher);
		if (!result) return null;
		const textNode = findDeepText(result.node);
		return { tree, ...result, textNode };
	};

	const save = () => {
		const newText = ref.current?.textContent || '';
		if (newText === text) return;

		const found = findMatch();
		if (found?.textNode) {
			const start = found.textNode.position.start.offset;
			const end = found.textNode.position.end.offset;
			const newSource = source.slice(0, start) + newText + source.slice(end);
			patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
		}
	};

	const deleteElement = () => {
		const found = findMatch();
		if (!found) return;
		const { node, parent, index } = found;
		const start = node.position.start.offset;
		// Include trailing whitespace up to the next sibling or parent end
		const siblings = parent?.children;
		const nextSibling = siblings?.[index + 1];
		const end = nextSibling ? nextSibling.position.start.offset : node.position.end.offset;
		const newSource = source.slice(0, start) + source.slice(end);
		patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (mode === 'idle') {
			setMode('selected');
		}
	};

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setMode('editing');
		requestAnimationFrame(() => {
			ref.current?.focus();
			const selection = window.getSelection();
			if (selection && ref.current) {
				const range = document.createRange();
				range.selectNodeContents(ref.current);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		});
	};

	const handleBlur = () => {
		if (mode === 'editing') {
			save();
		}
		setMode('idle');
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (mode === 'selected' && e.key === 'Backspace') {
			e.preventDefault();
			e.stopPropagation();
			deleteElement();
			setMode('idle');
		} else if (mode === 'selected' && e.key === 'Escape') {
			setMode('idle');
			ref.current?.blur();
		} else if (mode === 'editing' && e.key === 'Escape') {
			e.preventDefault();
			setMode('selected');
			window.getSelection()?.removeAllRanges();
		} else if (mode === 'selected' && e.key === 'Enter') {
			e.preventDefault();
			handleDoubleClick(e as any);
		}
	};

	useEffect(() => {
		if (mode === 'selected') {
			ref.current?.focus();
			window.getSelection()?.removeAllRanges();
		}
	}, [mode]);

	const className = mode === 'editing' ? styles.editableEditing
		: mode === 'selected' ? styles.editableSelected
		: styles.editable;

	return <Tag
		ref={ref}
		tabIndex={0}
		contentEditable={mode === 'editing'}
		suppressContentEditableWarning
		onClick={handleClick}
		onDoubleClick={handleDoubleClick}
		onBlur={handleBlur}
		onKeyDown={handleKeyDown}
		className={className}
	>{text}</Tag>;
};

const makeEditable = (tag: keyof JSX.IntrinsicElements, nodeType: string, nodeMatcher?: (node: any) => boolean) => {
	return (props: any & { source: string; slideIndex: number }) => (
		<EditableElement tag={tag} nodeType={nodeType} nodeMatcher={nodeMatcher} {...props} />
	);
};

const ScaledSlide = ({ children, slideIndex, fonts }: { children: string; slideIndex: number; fonts?: { heading?: string; body?: string } }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	const editableComponents = Object.fromEntries(
		[
			['h1', makeEditable('h1', 'heading', (n: any) => n.type === 'heading' && n.depth === 1)],
			['h2', makeEditable('h2', 'heading', (n: any) => n.type === 'heading' && n.depth === 2)],
			['h3', makeEditable('h3', 'heading', (n: any) => n.type === 'heading' && n.depth === 3)],
			['h4', makeEditable('h4', 'heading', (n: any) => n.type === 'heading' && n.depth === 4)],
			['h5', makeEditable('h5', 'heading', (n: any) => n.type === 'heading' && n.depth === 5)],
			['h6', makeEditable('h6', 'heading', (n: any) => n.type === 'heading' && n.depth === 6)],
			['p', makeEditable('p', 'paragraph')],
			['li', makeEditable('li', 'listItem')],
		].map(([tag, Component]) => [
			tag,
			(props: any) => <Component {...props} source={children} slideIndex={slideIndex} />,
		])
	);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setScale(Math.min(width / 1280, height / 720));
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	return <div ref={containerRef} className={styles.scaledSlideContainer}>
		<div className={styles.scaledSlideInner} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
			<Slide style={{ width: 1280, height: 720 }} components={editableComponents} fonts={fonts}>{children}</Slide>
		</div>
	</div>;
}

const HistoryPanel = ({ history }: { history: any }) => {
	if (!history) return <div className={styles.historyPanel} style={{ padding: '10px' }}>No history</div>;

	const opSummary = (ops: any[]) => {
		return ops.map(op => `${op.op} ${op.path}`).join(', ');
	};

	return <div className={styles.historyPanel}>
		<div style={{ padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>
			Edit History (pointer: {history.pointer})
		</div>
		<div style={{ padding: '4px', borderBottom: '1px solid #ccc', fontStyle: 'italic', opacity: history.pointer === -1 ? 1 : 0.4 }}>
			Base document {history.pointer === -1 && ' ←'}
		</div>
		{history.patches.map((patch: any) => (
			<div key={patch.index} style={{
				padding: '6px 8px',
				fontSize: '12px',
				fontFamily: 'monospace',
				borderBottom: '1px solid #eee',
				opacity: patch.active ? 1 : 0.4,
				background: patch.index === history.pointer ? '#e6f0ff' : 'transparent',
			}}>
				<span>{patch.index}: </span>
				<span>{opSummary(patch.operations)}</span>
				{patch.index === history.pointer && <span> ←</span>}
			</div>
		))}
		{history.totalPatches === 0 && <div style={{ padding: '8px', opacity: 0.5 }}>No edits yet</div>}
	</div>;
};

const AddSlideButton = ({ onClick }: { onClick: () => void }) => {
	return <button onClick={onClick} className={styles.addSlideButton}>+ Add slide</button>;
}

const HomePage = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides();
	const [slideSelected, setSlideSelected] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropTarget, setDropTarget] = useState<number | null>(null);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDragIndex(index);
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDropTarget(index);
	};

	const handleDragLeave = () => {
		setDropTarget(null);
	};

	const handleDrop = (e: React.DragEvent, toIndex: number) => {
		e.preventDefault();
		if (dragIndex === null || dragIndex === toIndex) return;
		patchDoc([
			{ op: 'move', from: `/sections/${dragIndex}`, path: `/sections/${toIndex}` },
		]);
		goto(toIndex);
		setDragIndex(null);
		setDropTarget(null);
	};

	const handleDragEnd = () => {
		setDragIndex(null);
		setDropTarget(null);
	};

	const deleteSlide = (index: number) => {
		if (!doc || doc.sections.length <= 1) return;
		patchDoc([{ op: 'remove', path: `/sections/${index}` }]);
		if (index > 0) prev();
	};

	// Undo/redo with Cmd+Z / Cmd+Shift+Z
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
				e.preventDefault();
				if (e.shiftKey) {
					fetch('/doc/redo', { method: 'POST' });
				} else {
					fetch('/doc/undo', { method: 'POST' });
				}
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, []);

	useKeybindings({
		'ArrowDown': () => { next(); setSlideSelected(false); },
		'ArrowRight': () => { next(); setSlideSelected(false); },
		'ArrowUp': () => { prev(); setSlideSelected(false); },
		'ArrowLeft': () => { prev(); setSlideSelected(false); },
		'Enter': () => { if (!slideSelected) setSlideSelected(true); },
		'Escape': () => { if (slideSelected) setSlideSelected(false); },
		'Backspace': () => { if (slideSelected) { deleteSlide(currentSlide); setSlideSelected(false); } },
	});

	const startPresentation = () => {
		window.location.pathname = "/present";
	}
	const openForPrint = () => {
		window.location.pathname = "/print";
	}

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!doc) return <div>No document loaded</div>;

	return <div className={styles.overview}>
		<CMDK>
			<Command.Item onSelect={startPresentation}>Start presentation</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
		</CMDK>
		<div className={styles.toolbar}>
			<div className={styles.toolbarLinks}>
				<LinkButton href="/present">Start presentation</LinkButton>
				<LinkButton href="/print">Open for print</LinkButton>
				<Button onClick={() => fetch('/doc/undo', { method: 'POST' })}>Undo</Button>
				<Button onClick={() => fetch('/doc/redo', { method: 'POST' })}>Redo</Button>
				<Button onClick={() => setShowHistory(h => !h)}>History</Button>
			</div>
			<ThemeSettings frontmatter={doc.frontmatter} />
		</div>
		<div className={styles.mainArea}>
			<div className={styles.slideList}>
			{
				doc.sections.map((section, i) => (
					<ViewTransition key={section.id} exit="slide-out" enter="slide-in">
						<div>
							<ContextMenu onOpen={() => goto(i)} items={[
								{ label: 'Insert slide above', onClick: () => patchDoc([{ op: 'add', path: `/sections/${i}`, value: { source: '\n# New slide\n\n' } }]) },
								{ label: 'Insert slide below', onClick: () => patchDoc([{ op: 'add', path: `/sections/${i + 1}`, value: { source: '\n# New slide\n\n' } }]) },
								{ label: 'Duplicate', onClick: () => patchDoc([{ op: 'add', path: `/sections/${i + 1}`, value: { source: section.source } }]) },
								{ label: 'Delete slide', onClick: () => deleteSlide(i) },
								{ label: 'Present from here', onClick: () => { window.location.href = `/present#${i}`; } },
							]}>
								<div className={[
										dragIndex === i ? styles.slideRowDragging : styles.slideRow,
										dropTarget === i && dragIndex !== null && dragIndex > i ? styles.slideRowDropAbove : '',
										dropTarget === i && dragIndex !== null && dragIndex < i ? styles.slideRowDropBelow : '',
									].join(' ')}
									onClick={() => { goto(i); setSlideSelected(i === currentSlide ? !slideSelected : false); }}
									draggable
									onDragStart={(e) => handleDragStart(e, i)}
									onDragOver={(e) => handleDragOver(e, i)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, i)}
									onDragEnd={handleDragEnd}>
									<span className={styles.slideNumber}>{i}</span>
									<div className={i === currentSlide && slideSelected ? styles.slideThumbSelected : i === currentSlide ? styles.slideThumbActive : styles.slideThumb}>
										<Preview fonts={doc.frontmatter.fonts}>{section.source}</Preview>
									</div>
								</div>
							</ContextMenu>
						</div>
					</ViewTransition>
				))
			}
			<div className={styles.addSlideRow}>
				<span className={styles.addSlideSpacer}>0</span>
				<AddSlideButton onClick={() => patchDoc([{ op: 'add', path: `/sections/-`, value: { source: '\n# New slide\n\n' } }])} />
			</div>
			</div>
			<div className={styles.previewArea}>
				<div className={styles.previewPane}>
					<ScaledSlide slideIndex={currentSlide} fonts={doc.frontmatter.fonts}>{doc.sections[currentSlide]?.source}</ScaledSlide>
				</div>
				<SlideEditor source={doc.sections[currentSlide]?.source || ''} slideIndex={currentSlide} />
			</div>
			{showHistory && <HistoryPanel history={(doc as any).history} />}
		</div>
		<div className={styles.bottomBar}>
			<Button onClick={prev}>Prev</Button>
			<span>{currentSlide}</span>
			<Button onClick={next}>Next</Button>
			<span className={styles.bottomBarHint}>Hit cmd+k for more actions</span>
		</div>
	</div>;
}

export default HomePage;
