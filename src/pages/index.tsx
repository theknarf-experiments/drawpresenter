import useSlides from '../useSlides';
import useKeybindings from '../useKeybindings';
import styles from '../app.module.css';
import Slide from '../slide';
import CMDK from '../components/cmdk';
import { Command } from 'cmdk';
import { Frontmatter } from '../document';
import { Button, LinkButton } from '../components/button';

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
			<Slide style={{ width: 1280, height: 720, fontSize: '14px' }}>{children}</Slide>
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

const AddSlideButton = ({ afterIndex }: { afterIndex: number }) => {
	const addSlide = async () => {
		await fetch('/doc/add-slide', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ afterIndex }),
		});
	};

	return <button onClick={addSlide} style={{
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
	useKeybindings({
		'ArrowDown': next,
		'ArrowRight': next,
		'ArrowUp': prev,
		'ArrowLeft': prev,
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
			<div style={{ margin: '10px', overflow: 'auto' }}>
			{
				doc.sections.map((section, i) => (
					<div key={`section-${i}`}>
						<div style={{ display: 'flex' }} onClick={() => goto(i)}>
							<span>{i}</span>
							<Preview>{section.source}</Preview>
						</div>
						<div style={{ display: 'flex' }}>
							<span style={{ visibility: 'hidden' }}>{i}</span>
							<AddSlideButton afterIndex={i} />
						</div>
					</div>
				))
			}
			</div>
			<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px', padding: '10px', background: '#f0f0f0' }}>
				<Slide style={{ width: '60vw', height: '60vh' }}>{doc.sections[currentSlide]?.source}</Slide>
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
