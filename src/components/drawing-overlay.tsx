import { useState, useRef } from 'react';
import getStroke from 'perfect-freehand';

interface StrokeData {
	points: number[][];
	color: string;
}

interface DrawingOverlayProps {
	slideIndex: number;
	strokes: StrokeData[] | undefined;
	enabled: boolean;
	color?: string;
}

const getSvgPathFromStroke = (stroke: number[][]) => {
	if (stroke.length === 0) return '';

	const d = stroke.reduce(
		(acc, [x0, y0], i, arr) => {
			const [x1, y1] = arr[(i + 1) % arr.length];
			acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
			return acc;
		},
		['M', ...stroke[0], 'Q']
	);

	d.push('Z');
	return d.join(' ');
};

const DrawingOverlay = ({ slideIndex, strokes = [], enabled, color = 'red' }: DrawingOverlayProps) => {
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

		fetch('/doc/drawing', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ slide: slideIndex, stroke: currentStroke, color }),
		});

		setCurrentStroke(null);
	};

	const renderStroke = (points: number[][], strokeColor: string, key: string) => {
		const strokePoints = getStroke(points, {
			size: 2,
			thinning: 0.5,
			smoothing: 0.5,
			streamline: 0.5,
		});
		return <path key={key} d={getSvgPathFromStroke(strokePoints)} fill={strokeColor} opacity={0.8} />;
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
		{strokes.map((stroke, i) => renderStroke(stroke.points, stroke.color, `s-${i}`))}
		{currentStroke && renderStroke(currentStroke, color, 'current')}
	</svg>;
};

export default DrawingOverlay;
