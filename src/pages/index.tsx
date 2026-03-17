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
import FittedSlide from '../components/fitted-slide';
import DrawingOverlay from '../components/drawing-overlay';
import { StrokeData, renderStrokePath } from '../components/stroke-renderer';
import Drawing from '../components/drawing';
import { parseMarkdown, serializeMarkdown } from '../mdast-utils';

const patchDoc = (operations: any[]) =>
	fetch('/doc', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(operations),
	});

const Preview = ({ children, fonts, cornerImage }: { children: string; fonts?: { heading?: string; body?: string }; cornerImage?: any }) => {
	return <div className={styles.previewOuter}>
		<div className={styles.previewInner}>
			<Slide style={{ width: 1280, height: 720 }} fonts={fonts} cornerImage={cornerImage}>{children}</Slide>
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

type Selection = { type: 'slide'; index: number } | { type: 'element'; id: string } | null;

interface EditableProps {
	tag: keyof JSX.IntrinsicElements;
	nodeType: string;
	nodeMatcher?: (node: any) => boolean;
	children: React.ReactNode;
	source: string;
	slideIndex: number;
	selection: Selection;
	setSelection: (s: Selection) => void;
	occurrenceIndex?: number;
}

// Recursively extract all text values from an AST node
const getNodeText = (node: any): string => {
	if (node.type === 'text') return node.value;
	if (node.children) return node.children.map(getNodeText).join('');
	return '';
};

// Walk AST depth-first, returning { node, parent, index } for the Nth match (0-indexed)
const walkTree = (tree: any, matcher: (node: any) => boolean, skip = 0): { node: any; parent: any; index: number } | null => {
	let count = 0;
	const walk = (node: any, parent: any, index: number): { node: any; parent: any; index: number } | null => {
		if (matcher(node)) {
			if (count === skip) return { node, parent, index };
			count++;
		}
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

// Recursively extract text from React children (handles nested elements like <p> inside <li>)
const extractText = (children: React.ReactNode): string => {
	if (typeof children === 'string') return children;
	if (typeof children === 'number') return String(children);
	if (children == null || typeof children === 'boolean') return '';
	if (Array.isArray(children)) return children.map(extractText).join('');
	if (typeof children === 'object' && 'props' in children) return extractText(children.props.children);
	return '';
};

const EditableElement = ({ tag: Tag, nodeType, nodeMatcher, children, source, slideIndex, selection, setSelection, occurrenceIndex = 0 }: EditableProps) => {
	const text = extractText(children);
	const ref = useRef<HTMLElement>(null);
	const [editing, setEditing] = useState(false);

	const elementId = `${slideIndex}:${nodeType}:${text}:${occurrenceIndex}`;
	const isSelected = selection?.type === 'element' && selection.id === elementId;
	const mode = editing ? 'editing' : isSelected ? 'selected' : 'idle';

	const matcher = nodeMatcher || ((node: any) => node.type === nodeType);
	// For elements that can appear multiple times (like li), match by text content
	const textMatcher = (node: any) => matcher(node) && getNodeText(node) === text;

	const findMatch = () => {
		const tree = parseMarkdown(source);
		// Try text-aware match first (skip N occurrences for duplicates), fall back to type-only match
		const result = walkTree(tree, textMatcher, occurrenceIndex) || walkTree(tree, matcher);
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

	const select = () => setSelection({ type: 'element', id: elementId });
	const deselect = () => setSelection(null);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (mode === 'idle') {
			select();
		}
	};

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setEditing(true);
		requestAnimationFrame(() => {
			ref.current?.focus();
			const sel = window.getSelection();
			if (sel && ref.current) {
				const range = document.createRange();
				range.selectNodeContents(ref.current);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		});
	};

	const handleBlur = () => {
		if (editing) {
			save();
			setEditing(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (mode === 'selected' && e.key === 'Backspace') {
			e.preventDefault();
			e.stopPropagation();
			deleteElement();
			deselect();
		} else if (mode === 'selected' && (e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'x')) {
			e.preventDefault();
			const found = findMatch();
			if (found) {
				const start = found.node.position.start.offset;
				const end = found.node.position.end.offset;
				navigator.clipboard.writeText(source.slice(start, end));
				if (e.key === 'x') {
					deleteElement();
					deselect();
				}
			}
		} else if (mode === 'selected' && e.key === 'Escape') {
			deselect();
			ref.current?.blur();
		} else if (mode === 'editing' && e.key === 'Escape') {
			e.preventDefault();
			setEditing(false);
			select();
			window.getSelection()?.removeAllRanges();
		} else if (mode === 'selected' && e.key === 'Enter') {
			e.preventDefault();
			handleDoubleClick(e as any);
		}
	};

	useEffect(() => {
		if (isSelected && !editing) {
			ref.current?.focus();
			window.getSelection()?.removeAllRanges();
		}
	}, [isSelected, editing]);

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
	>{mode === 'editing' ? text : children}</Tag>;
};

const makeEditable = (tag: keyof JSX.IntrinsicElements, nodeType: string, nodeMatcher?: (node: any) => boolean) => {
	return (props: any & { source: string; slideIndex: number; selection: Selection; setSelection: (s: Selection) => void }) => (
		<EditableElement tag={tag} nodeType={nodeType} nodeMatcher={nodeMatcher} {...props} />
	);
};

const SelectableDrawing = ({ data, source, slideIndex, selection, setSelection }: {
	data: string; source: string; slideIndex: number; selection: Selection; setSelection: (s: Selection) => void;
}) => {
	const elementId = `${slideIndex}:drawing:0`;
	const isSelected = selection?.type === 'element' && selection.id === elementId;
	const ref = useRef<HTMLDivElement>(null);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setSelection({ type: 'element', id: elementId });
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isSelected) return;
		if (e.key === 'Backspace') {
			e.preventDefault();
			e.stopPropagation();
			// Find and remove the <Drawing> from the source
			const tree = parseMarkdown(source);
			const node = walkTree(tree, (n: any) => n.type === 'mdxJsxFlowElement' && n.name === 'Drawing');
			if (node) {
				const start = node.node.position.start.offset;
				const end = node.node.position.end.offset;
				// Also remove surrounding newlines
				const nextNode = node.parent?.children?.[node.index + 1];
				const cleanEnd = nextNode ? nextNode.position.start.offset : end;
				const newSource = source.slice(0, start) + source.slice(cleanEnd);
				patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
			}
			setSelection(null);
		} else if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'x')) {
			e.preventDefault();
			const tree = parseMarkdown(source);
			const node = walkTree(tree, (n: any) => n.type === 'mdxJsxFlowElement' && n.name === 'Drawing');
			if (node) {
				const start = node.node.position.start.offset;
				const end = node.node.position.end.offset;
				navigator.clipboard.writeText(source.slice(start, end));
				if (e.key === 'x') {
					const nextNode = node.parent?.children?.[node.index + 1];
					const cleanEnd = nextNode ? nextNode.position.start.offset : end;
					const newSource = source.slice(0, start) + source.slice(cleanEnd);
					patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
					setSelection(null);
				}
			}
		} else if (e.key === 'Escape') {
			setSelection(null);
			ref.current?.blur();
		}
	};

	useEffect(() => {
		if (isSelected) {
			ref.current?.focus();
		}
	}, [isSelected]);

	let strokes: StrokeData[];
	try { strokes = JSON.parse(data); } catch { strokes = []; }
	const [hovered, setHovered] = useState(false);

	const outlineColor = isSelected ? 'rgba(0, 102, 255, 0.3)' : hovered ? 'rgba(255, 255, 255, 0.2)' : 'none';

	return <>
		<svg
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			style={{
				position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
				zIndex: 5, pointerEvents: 'none',
			}}
		>
			{strokes.map((stroke, i) => renderStrokePath(stroke.points, stroke.color, stroke.size, `d-${i}`))}
			{outlineColor !== 'none' && strokes.map((stroke, i) =>
				<polyline
					key={`outline-${i}`}
					points={stroke.points.map(p => `${p[0]},${p[1]}`).join(' ')}
					fill="none"
					stroke={outlineColor}
					strokeWidth={stroke.size + 1}
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			)}
			{strokes.map((stroke, i) =>
				<polyline
					key={`hit-${i}`}
					points={stroke.points.map(p => `${p[0]},${p[1]}`).join(' ')}
					fill="none"
					stroke="transparent"
					strokeWidth={Math.max(stroke.size * 4, 8)}
					style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
					onClick={handleClick}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
				/>
			)}
		</svg>
		<div
			ref={ref}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
		/>
	</>;
};

const ScaledSlide = ({ children, slideIndex, fonts, cornerImage, selection, setSelection, drawMode, drawColor, drawSize }: {
	children: string; slideIndex: number; fonts?: { heading?: string; body?: string }; cornerImage?: any;
	selection: Selection; setSelection: (s: Selection) => void;
	drawMode?: boolean; drawColor?: string; drawSize?: number;
}) => {
	const counters = useRef<Map<string, number>>(new Map());
	counters.current.clear();

	// Parse existing drawing strokes from the slide source
	const existingDrawingMatch = children.match(/<Drawing\s+data='([^']*)'\s*\/>/);
	const existingStrokes: StrokeData[] = existingDrawingMatch
		? (() => { try { return JSON.parse(existingDrawingMatch[1]); } catch { return []; } })()
		: [];

	const withCounter = (Component: any) => (props: any) => {
		const text = extractText(props.children);
		const key = `${props.nodeType || ''}:${text}`;
		const idx = counters.current.get(key) || 0;
		counters.current.set(key, idx + 1);
		return <Component {...props} source={children} slideIndex={slideIndex} selection={selection} setSelection={setSelection} occurrenceIndex={idx} />;
	};

	const editableComponents = {
		...Object.fromEntries(
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
				withCounter(Component),
			])
		),
		Drawing: (props: any) => <SelectableDrawing {...props} source={children} slideIndex={slideIndex} selection={selection} setSelection={setSelection} />,
	};

	const handleStrokeComplete = (points: number[][]) => {
		const stroke: StrokeData = { points, color: drawColor || 'red', size: drawSize || 2 };
		const newStrokes = [...existingStrokes, stroke];

		const dataJson = JSON.stringify(newStrokes);
		const drawingTag = `<Drawing data='${dataJson}' />`;

		// Check if there's already a <Drawing> in the source and replace it
		const drawingRegex = /<Drawing\s+data='[^']*'\s*\/>/;
		let newSource: string;
		if (drawingRegex.test(children)) {
			newSource = children.replace(drawingRegex, drawingTag);
		} else {
			newSource = children.trimEnd() + `\n\n${drawingTag}\n\n`;
		}
		patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
	};

	const overlay = drawMode ? <DrawingOverlay
		slideIndex={slideIndex}
		strokes={existingStrokes}
		enabled={true}
		color={drawColor}
		size={drawSize}
		onStrokeComplete={handleStrokeComplete}
	/> : undefined;

	return <FittedSlide fonts={fonts} cornerImage={cornerImage} components={editableComponents} overlay={overlay}>{children}</FittedSlide>;
}

const HistoryPanel = ({ history }: { history: any }) => {
	if (!history) return <div className={styles.historyPanel} style={{ padding: '10px' }}>No history</div>;

	const opSummary = (ops: any[]) => {
		return ops.map(op => `${op.op} ${op.path}`).join(', ');
	};

	const sourceIcon = (source: string) => source === 'file' ? '[file]' : '[user]';

	return <div className={styles.historyPanel}>
		<div style={{ padding: '8px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>
			Edit History (pointer: {history.pointer})
		</div>
		<div style={{ padding: '4px', borderBottom: '1px solid #ccc', fontStyle: 'italic', opacity: history.pointer === -1 ? 1 : 0.4 }}>
			Base document {history.pointer === -1 && ' ←'}
		</div>
		{history.entries.map((entry: any) => (
			<div key={entry.index} style={{
				padding: '6px 8px',
				fontSize: '12px',
				fontFamily: 'monospace',
				borderBottom: '1px solid #eee',
				opacity: entry.active ? 1 : 0.4,
				background: entry.index === history.pointer ? '#e6f0ff' : 'transparent',
			}}>
				<span>{entry.index} {sourceIcon(entry.source)}: </span>
				<span>{opSummary(entry.operations)}</span>
				{entry.index === history.pointer && <span> ←</span>}
			</div>
		))}
		{history.totalEntries === 0 && <div style={{ padding: '8px', opacity: 0.5 }}>No edits yet</div>}
	</div>;
};

const AddSlideButton = ({ onClick }: { onClick: () => void }) => {
	return <button onClick={onClick} className={styles.addSlideButton}>+ Add slide</button>;
}

const HomePage = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides();
	const [selection, setSelection] = useState<Selection>(null);
	const [showHistory, setShowHistory] = useState(false);
	const [drawMode, setDrawMode] = useState(false);
	const [drawColor, setDrawColor] = useState('#ff4444');
	const [drawSize, setDrawSize] = useState(2);

	const slideSelected = selection?.type === 'slide' && selection.index === currentSlide;
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
		setSelection({ type: 'slide', index: toIndex });
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

	// Keyboard shortcuts: undo/redo, copy/paste
	useEffect(() => {
		const handler = async (e: KeyboardEvent) => {
			// Skip if inside an editable element or text input
			const target = e.target as HTMLElement;
			const tag = target?.tagName;
			if (target?.isContentEditable || tag === 'TEXTAREA' || tag === 'INPUT') return;

			if (!(e.metaKey || e.ctrlKey)) return;

			if (e.key === 'z') {
				e.preventDefault();
				if (e.shiftKey) {
					fetch('/doc/redo', { method: 'POST' });
				} else {
					fetch('/doc/undo', { method: 'POST' });
				}
			} else if ((e.key === 'c' || e.key === 'x') && slideSelected && doc) {
				e.preventDefault();
				const source = doc.sections[currentSlide]?.source || '';
				await navigator.clipboard.writeText('---\n' + source);
				if (e.key === 'x') {
					deleteSlide(currentSlide);
					setSelection(null);
				}
			} else if (e.key === 'v' && doc) {
				e.preventDefault();

				// Check for image on clipboard
				const items = await navigator.clipboard.read();
				let handled = false;
				for (const item of items) {
					const imageType = item.types.find(t => t.startsWith('image/'));
					if (imageType) {
						const blob = await item.getType(imageType);
						const ext = imageType.split('/')[1].replace('jpeg', 'jpg');
						const filename = `image-${Date.now()}.${ext}`;

						const buffer = await blob.arrayBuffer();
						const base64 = btoa(
							new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
						);

						await fetch('/doc/upload-image', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ data: base64, filename }),
						});

						// Insert image into current slide
						const currentSource = doc.sections[currentSlide]?.source || '';
						const newSource = currentSource.trimEnd() + `\n\n![](${filename})\n\n`;
						patchDoc([{ op: 'replace', path: `/sections/${currentSlide}/source`, value: newSource }]);
						handled = true;
						break;
					}
				}

				if (!handled) {
					const text = await navigator.clipboard.readText();
					if (text.trim()) {
						if (text.startsWith('---\n')) {
							// Slide paste — insert as new slide after current
							const source = text.slice(4); // strip the --- prefix
							patchDoc([{ op: 'add', path: `/sections/${currentSlide + 1}`, value: { source } }]);
						} else {
							// Element paste — append to current slide
							const currentSource = doc.sections[currentSlide]?.source || '';
							const newSource = currentSource.trimEnd() + `\n\n${text.trim()}\n\n`;
							patchDoc([{ op: 'replace', path: `/sections/${currentSlide}/source`, value: newSource }]);
						}
					}
				}
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [selection, currentSlide, doc]);

	useKeybindings({
		'ArrowDown': () => { next(); setSelection(null); },
		'ArrowRight': () => { next(); setSelection(null); },
		'ArrowUp': () => { prev(); setSelection(null); },
		'ArrowLeft': () => { prev(); setSelection(null); },
		'Enter': () => { if (!slideSelected) setSelection({ type: 'slide', index: currentSlide }); },
		'Escape': () => { if (selection) setSelection(null); },
		'Backspace': () => { if (slideSelected) { deleteSlide(currentSlide); setSelection(null); } },
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

	return <div className={styles.overview} onClick={() => setSelection(null)}>
		<CMDK>
			<Command.Item onSelect={startPresentation}>Start</Command.Item>
			<Command.Item onSelect={openForPrint}>Print</Command.Item>
		</CMDK>
		<div className={styles.toolbar}>
			<div className={styles.toolbarLinks}>
				<LinkButton href="/present">Start</LinkButton>
				<LinkButton href="/presenter">Presenter</LinkButton>
				<LinkButton href="/print">Print</LinkButton>
				<Button onClick={() => fetch('/doc/undo', { method: 'POST' })}>Undo</Button>
				<Button onClick={() => fetch('/doc/redo', { method: 'POST' })}>Redo</Button>
				<Button onClick={() => { setDrawMode(d => !d); if (drawMode) setSelection(null); }}>{drawMode ? 'Stop drawing' : 'Draw'}</Button>
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
									onClick={(e) => { e.stopPropagation(); goto(i); setSelection({ type: 'slide', index: i }); }}
									draggable
									onDragStart={(e) => handleDragStart(e, i)}
									onDragOver={(e) => handleDragOver(e, i)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, i)}
									onDragEnd={handleDragEnd}>
									<span className={styles.slideNumber}>{i}</span>
									<div className={selection?.type === 'slide' && selection.index === i ? styles.slideThumbSelected : i === currentSlide ? styles.slideThumbActive : styles.slideThumb}>
										<Preview fonts={doc.frontmatter.fonts} cornerImage={doc.frontmatter.cornerImage}>{section.source}</Preview>
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
					<ScaledSlide slideIndex={currentSlide} fonts={doc.frontmatter.fonts} cornerImage={doc.frontmatter.cornerImage} selection={selection} setSelection={setSelection} drawMode={drawMode} drawColor={drawColor} drawSize={drawSize}>{doc.sections[currentSlide]?.source}</ScaledSlide>
				</div>
				{drawMode && <div style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.5em',
					padding: '8px 12px',
					background: '#f5f5f5',
					borderBottom: '1px solid #ddd',
				}}>
					{[
						{ name: 'Red', value: '#ff4444' },
						{ name: 'Blue', value: '#4488ff' },
						{ name: 'Green', value: '#44cc44' },
						{ name: 'Yellow', value: '#ffcc00' },
						{ name: 'Black', value: '#000000' },
						{ name: 'Orange', value: '#ff8800' },
					].map(c => (
						<button
							key={c.value}
							onClick={() => setDrawColor(c.value)}
							title={c.name}
							style={{
								width: 28, height: 28,
								borderRadius: '50%',
								background: c.value,
								border: drawColor === c.value ? '3px solid #0066ff' : '2px solid #ccc',
								cursor: 'pointer',
								boxShadow: drawColor === c.value ? '0 0 4px rgba(0,102,255,0.4)' : 'none',
							}}
						/>
					))}
					<input
						type="range"
						min={1}
						max={8}
						step={0.5}
						value={drawSize}
						onChange={(e) => setDrawSize(Number(e.target.value))}
						style={{ width: '80px', marginLeft: '8px' }}
					/>
					<svg width="24" height="24" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r={drawSize * 1.5} fill={drawColor} opacity={0.8} />
					</svg>
				</div>}
				<SlideEditor source={doc.sections[currentSlide]?.source || ''} slideIndex={currentSlide} />
			</div>
			{showHistory && <HistoryPanel history={(doc as any).history} />}
		</div>
	</div>;
}

export default HomePage;
