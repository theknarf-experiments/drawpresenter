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

const patchDoc = (operations: any[]) =>
	fetch('/doc', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(operations),
	});

const Preview = ({ children }) => {
	return <div style={{
		width: 256, height: 144,
		overflow: 'hidden',
		border: '1px solid black',
		margin: 5,
	}}>
		<div style={{
			transform: 'scale(0.2)',
			transformOrigin: 'top left',
			width: 1280, height: 720,
		}}>
			<Slide style={{ width: 1280, height: 720 }}>{children}</Slide>
		</div>
	</div>;
}

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
	return <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
		<span>{label}</span>
		<input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
		<input type="text" value={value} onChange={(e) => onChange(e.target.value)}
			style={{ width: '70px', fontFamily: 'monospace', fontSize: '12px' }} />
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

	return <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
		<strong>Theme</strong>
		<ColorInput label="bg" value={colors.bg || '#000000'} onChange={(v) => updateColor('bg', v)} />
		<ColorInput label="text" value={colors.text || '#ffffff'} onChange={(v) => updateColor('text', v)} />
		<ColorInput label="link" value={colors.link || '#ffffff'} onChange={(v) => updateColor('link', v)} />
	</div>;
}

const SlideEditor = ({ source, slideIndex }: { source: string; slideIndex: number }) => {
	const [value, setValue] = useState(source);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync from external changes (e.g. SSE updates)
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
		style={{
			width: '100%',
			height: '200px',
			fontFamily: 'monospace',
			fontSize: '14px',
			padding: '8px',
			boxSizing: 'border-box',
			resize: 'vertical',
		}}
	/>;
}

const ScaledSlide = ({ children }: { children: string }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setScale(Math.min(width / 1280, height / 720));
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	return <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
		<div style={{
			width: 1280, height: 720,
			transform: `scale(${scale})`,
			transformOrigin: 'center center',
			flexShrink: 0,
		}}>
			<Slide style={{ width: 1280, height: 720 }}>{children}</Slide>
		</div>
	</div>;
}

const AddSlideButton = ({ onClick }: { onClick: () => void }) => {
	return <button onClick={onClick} style={{
		width: 256,
		marginLeft: 5,
		padding: '4px',
		cursor: 'pointer',
		opacity: 0.5,
		marginBottom: '12px',
		boxSizing: 'border-box',
	}}>+ Add slide</button>;
}

const HomePage = () => {
	const [ currentSlide, { next, prev, goto }, doc, isLoading, error ] = useSlides();
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
		'ArrowDown': next,
		'ArrowRight': next,
		'ArrowUp': prev,
		'ArrowLeft': prev,
		'Backspace': () => deleteSlide(currentSlide),
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

	return <div className={styles.present} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
		<CMDK>
			<Command.Item onSelect={startPresentation}>Start presentation</Command.Item>
			<Command.Item onSelect={openForPrint}>Open for print</Command.Item>
		</CMDK>
		<div className={styles.container} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			<div style={{ display: 'flex', gap: '8px' }}>
				<LinkButton href="/present">Start presentation</LinkButton>
				<LinkButton href="/print">Open for print</LinkButton>
			</div>
			<ThemeSettings frontmatter={doc.frontmatter} />
		</div>
		<div style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>
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
								<div className={i === currentSlide ? styles.slideThumbActive : styles.slideThumb}
									onClick={() => goto(i)}
									draggable
									onDragStart={(e) => handleDragStart(e, i)}
									onDragOver={(e) => handleDragOver(e, i)}
									onDragLeave={handleDragLeave}
									onDrop={(e) => handleDrop(e, i)}
									onDragEnd={handleDragEnd}
									style={{
										opacity: dragIndex === i ? 0.4 : 1,
										borderTop: dropTarget === i && dragIndex !== null && dragIndex > i ? '3px solid #0066ff' : undefined,
										borderBottom: dropTarget === i && dragIndex !== null && dragIndex < i ? '3px solid #0066ff' : undefined,
									}}>
									<span>{i}</span>
									<Preview>{section.source}</Preview>
								</div>
							</ContextMenu>
							<div style={{ display: 'flex' }}>
								<span style={{ visibility: 'hidden' }}>{i}</span>
								<AddSlideButton onClick={() => patchDoc([{ op: 'add', path: `/sections/${i + 1}`, value: { source: '\n# New slide\n\n' } }])} />
							</div>
						</div>
					</ViewTransition>
				))
			}
			</div>
			<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
				<div style={{ flex: 1, display: 'flex', background: '#f0f0f0', padding: '10px', minHeight: 0 }}>
					<ScaledSlide>{doc.sections[currentSlide]?.source}</ScaledSlide>
				</div>
				<SlideEditor source={doc.sections[currentSlide]?.source || ''} slideIndex={currentSlide} />
			</div>
		</div>
		<div className={styles.container}>
			<Button onClick={prev}>Prev</Button>
			<span>{currentSlide}</span>
			<Button onClick={next}>Next</Button>
			<span style={{ marginLeft: '16px' }}>Hit cmd+k for more actions</span>
		</div>
	</div>;
}

export default HomePage;
