import React, {useEffect, useRef} from 'react';
import useOnResize from 'hooks/useOnResize';
import './Static.scss';

export default function Static() {
    const ref = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let animationFrameId = 0;
        const render = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d')!;
                const img = ctx.createImageData(canvas.width, canvas.height);
                const buffer = new Uint32Array(img.data.buffer);
                for (let i = 0; i < buffer.length; i++) {
                    // eslint-disable-next-line no-bitwise
                    buffer[i] = ((255 * Math.random()) | 0) << 24;
                }
                ctx.putImageData(img, 0, 0);
            }
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    useOnResize(ref, ({width, height}) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = Math.ceil(width);
            canvas.height = Math.ceil(height);
        }
    });

    return (
        <div className="static" ref={ref}>
            <canvas ref={canvasRef} />
        </div>
    );
}
