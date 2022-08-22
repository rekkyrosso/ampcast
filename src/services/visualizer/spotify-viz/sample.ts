import {interpolateRgb, interpolateBasis} from 'd3-interpolate';
import {sin, circle} from './util/canvas';
import {PaintData, VisualizerPreset} from './Visualizer';

const colors = ['#18FF2A', '#7718FF', '#06C5FE', '#FF4242', '#18FF2A'];
let prevColor = '';
let nextColor = '';

const sample: VisualizerPreset = {
    volumeSmoothing: 10,

    onBar() {
        prevColor = nextColor || getRandomColor(colors);
        nextColor = getRandomColor(colors.filter((color) => color !== nextColor));
    },

    onPaint({ctx, height, width, now, sync}: PaintData) {
        const bar = interpolateBasis([0, sync.volume * 10, 0])(sync.bar.progress);
        const beat = interpolateBasis([0, sync.volume * 300, 0])(sync.beat.progress);
        ctx.fillStyle = 'rgba(0, 0, 0, .08)';
        ctx.fillRect(0, 0, width, height);
        ctx.lineWidth = bar;
        ctx.strokeStyle = interpolateRgb(prevColor, nextColor)(sync.bar.progress);
        sin(ctx, now / 50, height / 2, sync.volume * 50, 100);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.beginPath();
        ctx.lineWidth = beat;
        circle(ctx, width / 2, height / 2, (sync.volume * height) / 5 + beat / 10);
        ctx.stroke();
        ctx.fill();
    },
};

function getRandomColor(arr: string[]): string {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

export default sample;
