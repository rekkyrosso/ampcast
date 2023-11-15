import React, {useEffect, useRef} from 'react';
import useOnResize from 'hooks/useOnResize';
import './Static.scss';

export default function Static() {
    const ref = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        const render = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;
            const data = ctx.createImageData(canvas.width, canvas.height);
            const buffer = new Uint32Array(data.data.buffer);
            for (let i = 0; i < buffer.length; i++) {
                // eslint-disable-next-line no-bitwise
                buffer[i] = ((255 * Math.random()) | 0) << 24;
            }
            ctx.putImageData(data, 0, 0);
            animationFrameId = requestAnimationFrame(render);
        };
        animationFrameId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    useOnResize(ref, () => {
        const canvas = canvasRef.current!;
        const rect = ref.current!.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    });

    return (
        <div className="static" ref={ref}>
            <canvas ref={canvasRef} />
        </div>
    );
}
