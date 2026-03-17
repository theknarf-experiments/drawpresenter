import { useState, useEffect, useRef, ReactNode } from 'react';
import Slide, { SlideProps } from '../slide';
import styles from '../app.module.css';

interface FittedSlideProps extends SlideProps {
	children: string;
	overlay?: ReactNode;
}

const FittedSlide = ({ children, overlay, ...slideProps }: FittedSlideProps) => {
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

	return <div ref={containerRef} className={styles.scaledSlideContainer}>
		<div className={styles.scaledSlideInner} style={{ transform: `scale(${scale})`, transformOrigin: 'top center', position: 'relative' }}>
			<Slide style={{ width: 1280, height: 720 }} {...slideProps}>{children}</Slide>
			{overlay}
		</div>
	</div>;
};

export default FittedSlide;
