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

const Preview = ({ children }) => {
	return <div className={styles.previewOuter}>
		<div className={styles.previewInner}>
			<Slide style={{ width: 1280, height: 720 }}>{children}</Slide>
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

const EditableH1 = ({ children, source, slideIndex }: { children: React.ReactNode; source: string; slideIndex: number }) => {
	const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children);
	const ref = useRef<HTMLHeadingElement>(null);
	const [mode, setMode] = useState<'idle' | 'selected' | 'editing'>('idle');

	const save = () => {
		const newText = ref.current?.textContent || '';
		if (newText === text) return;

		const tree = parseMarkdown(source);
		const heading = tree.children.find(
			(node: any) => node.type === 'heading' && node.depth === 1
		);
		if (heading && heading.children?.[0]?.type === 'text') {
			const textNode = heading.children[0];
			const start = textNode.position.start.offset;
			const end = textNode.position.end.offset;
			const newSource = source.slice(0, start) + newText + source.slice(end);
			patchDoc([{ op: 'replace', path: `/sections/${slideIndex}/source`, value: newSource }]);
		}
	};

	const deleteHeading = () => {
		const tree = parseMarkdown(source);
		const headingIndex = tree.children.findIndex(
			(node: any) => node.type === 'heading' && node.depth === 1
		);
		if (headingIndex === -1) return;
		const heading = tree.children[headingIndex];
		const start = heading.position.start.offset;
		// Include trailing newline(s) after the heading
		const nextNode = tree.children[headingIndex + 1];
		const end = nextNode ? nextNode.position.start.offset : heading.position.end.offset;
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
			deleteHeading();
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

	// Focus the element when selected so it receives keyboard events
	useEffect(() => {
		if (mode === 'selected') {
			ref.current?.focus();
			window.getSelection()?.removeAllRanges();
		}
	}, [mode]);

	const className = mode === 'editing' ? styles.editableH1Editing
		: mode === 'selected' ? styles.editableH1Selected
		: styles.editableH1;

	return <h1
		ref={ref}
		tabIndex={0}
		contentEditable={mode === 'editing'}
		suppressContentEditableWarning
		onClick={handleClick}
		onDoubleClick={handleDoubleClick}
		onBlur={handleBlur}
		onKeyDown={handleKeyDown}
		className={className}
	>{text}</h1>;
};

const ScaledSlide = ({ children, slideIndex }: { children: string; slideIndex: number }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	const editableComponents = {
		h1: (props: any) => <EditableH1 {...props} source={children} slideIndex={slideIndex} />,
	};

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
			<Slide style={{ width: 1280, height: 720 }} components={editableComponents}>{children}</Slide>
		</div>
	</div>;
}

const AddSlideButton = ({ onClick }: { onClick: () => void }) => {
	return <button onClick={onClick} className={styles.addSlideButton}>+ Add slide</button>;
}

const HomePage = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides();
	const [slideSelected, setSlideSelected] = useState(false);
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
										<Preview>{section.source}</Preview>
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
					<ScaledSlide slideIndex={currentSlide}>{doc.sections[currentSlide]?.source}</ScaledSlide>
				</div>
				<SlideEditor source={doc.sections[currentSlide]?.source || ''} slideIndex={currentSlide} />
			</div>
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
