import { useRef, useEffect, useId, ReactNode } from 'react';

interface MenuItem {
	label: string;
	onClick: () => void;
}

interface ContextMenuProps {
	items: MenuItem[];
	children: ReactNode;
	onOpen?: () => void;
}

const ContextMenu = ({ items, children, onOpen }: ContextMenuProps) => {
	const popoverRef = useRef<HTMLDivElement>(null);
	const id = useId();

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		const popover = popoverRef.current;
		if (!popover) return;

		popover.style.left = `${e.clientX}px`;
		popover.style.top = `${e.clientY}px`;
		popover.showPopover();
		onOpen?.();
	};

	// Close on click outside or Escape
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const popover = popoverRef.current;
			if (!popover) return;
			if (!popover.matches(':popover-open')) return;
			if (!popover.contains(e.target as Node)) {
				popover.hidePopover();
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				popoverRef.current?.hidePopover();
			}
		};

		document.addEventListener('mousedown', handleClick);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClick);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	return <>
		<div onContextMenu={handleContextMenu}>
			{children}
		</div>
		<div
			ref={popoverRef}
			id={id}
			// @ts-ignore
			popover="manual"
			style={{
				position: 'fixed',
				margin: 0,
				background: 'white',
				border: '1px solid #ccc',
				borderRadius: '4px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				padding: '4px 0',
				minWidth: '180px',
			}}
		>
			{items.map((item, i) => (
				<div key={i} onClick={() => {
					item.onClick();
					popoverRef.current?.hidePopover();
				}} style={{
					padding: '6px 12px',
					cursor: 'pointer',
					fontSize: '14px',
				}} onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
				   onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
					{item.label}
				</div>
			))}
		</div>
	</>;
};

export default ContextMenu;
