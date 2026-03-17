import getStroke from 'perfect-freehand';

export interface StrokeData {
	points: number[][];
	color: string;
	size: number;
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

export const renderStrokePath = (points: number[][], color: string, size: number, key: string) => {
	const strokePoints = getStroke(points, {
		size,
		thinning: 0.5,
		smoothing: 0.5,
		streamline: 0.5,
	});
	return <path key={key} d={getSvgPathFromStroke(strokePoints)} fill={color} opacity={0.8} />;
};
