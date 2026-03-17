import { renderStrokePath, StrokeData } from './stroke-renderer';

interface DrawingProps {
	data: string; // JSON-encoded StrokeData[]
}

const Drawing = ({ data }: DrawingProps) => {
	let strokes: StrokeData[];
	try {
		strokes = JSON.parse(data);
	} catch {
		return null;
	}

	return <svg
		viewBox="0 0 100 100"
		preserveAspectRatio="none"
		style={{
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			pointerEvents: 'none',
			zIndex: 5,
		}}
	>
		{strokes.map((stroke, i) => renderStrokePath(stroke.points, stroke.color, stroke.size, `d-${i}`))}
	</svg>;
};

export default Drawing;
