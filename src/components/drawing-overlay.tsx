import { useState, useRef } from 'react';
import { renderStrokePath, StrokeData } from './stroke-renderer';

interface DrawingOverlayProps {
	slideIndex: number;
	strokes: StrokeData[] | undefined;
	enabled: boolean;
	color?: string;
	size?: number;
	onStrokeComplete?: (stroke: number[][]) => void;
}

const DrawingOverlay = ({ slideIndex, strokes = [], enabled, color = 'red', size = 2, onStrokeComplete }: DrawingOverlayProps) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const [currentStroke, setCurrentStroke] = useState<number[][] | null>(null);
	const isDrawing = useRef(false);

	const handlePointerDown = (e: React.PointerEvent) => {
		if (!enabled) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		isDrawing.current = true;
		const rect = svgRef.current!.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		setCurrentStroke([[x, y, e.pressure]]);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!isDrawing.current || !currentStroke) return;
		const rect = svgRef.current!.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		setCurrentStroke(prev => [...(prev || []), [x, y, e.pressure]]);
	};

	const handlePointerUp = () => {
		if (!isDrawing.current || !currentStroke) return;
		isDrawing.current = false;

		if (onStrokeComplete) {
			onStrokeComplete(currentStroke);
		} else {
			// Default: send to server for live drawing
			fetch('/doc/drawing', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slide: slideIndex, stroke: currentStroke, color, size }),
			});
		}

		setCurrentStroke(null);
	};

	return <svg
		ref={svgRef}
		viewBox="0 0 100 100"
		preserveAspectRatio="none"
		style={{
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			cursor: enabled ? 'crosshair' : 'default',
			pointerEvents: enabled ? 'auto' : 'none',
			zIndex: 10,
		}}
		onPointerDown={handlePointerDown}
		onPointerMove={handlePointerMove}
		onPointerUp={handlePointerUp}
		onTouchStart={(e) => { if (enabled) e.preventDefault(); }}
		onTouchMove={(e) => { if (enabled) e.preventDefault(); }}
	>
		{strokes.map((stroke, i) => renderStrokePath(stroke.points, stroke.color, stroke.size, `s-${i}`))}
		{currentStroke && renderStrokePath(currentStroke, color, size, 'current')}
	</svg>;
};

export default DrawingOverlay;
