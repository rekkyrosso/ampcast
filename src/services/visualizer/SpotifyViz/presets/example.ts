import {interpolateRgb, interpolateBasis} from 'd3-interpolate';
import {SpotifyVizConfig, SpotifyVizPaintData} from '../SpotifyVizPlayer';

// From: https://github.com/zachwinter/spotify-viz/blob/master/client/example.js

const colors = ['#18FF2A', '#7718FF', '#06C5FE', '#FF4242', '#18FF2A'];
let prevColor = '';
let nextColor = '';

const example: SpotifyVizConfig = {
    volumeSmoothing: 10,

    onBar() {
        prevColor = nextColor || getRandomColor(colors);
        nextColor = getRandomColor(colors.filter((color) => color !== nextColor));
    },

    onPaint({context2D, height, width, now, analyser}: SpotifyVizPaintData) {
        const bar = interpolateBasis([0, analyser.volume * 10, 0])(analyser.bar.progress);
        const beat = interpolateBasis([0, analyser.volume * 300, 0])(analyser.beat.progress);
        context2D.fillStyle = 'rgba(0, 0, 0, .08)';
        context2D.fillRect(0, 0, width, height);
        context2D.lineWidth = bar;
        context2D.strokeStyle = interpolateRgb(prevColor, nextColor)(analyser.bar.progress);
        sin(context2D, now / 50, height / 2, analyser.volume * 50, 100);
        context2D.stroke();
        context2D.fillStyle = 'rgba(0, 0, 0, 1)';
        context2D.beginPath();
        context2D.lineWidth = beat;
        circle(context2D, width / 2, height / 2, (analyser.volume * height) / 5 + beat / 10);
        context2D.stroke();
        context2D.fill();
    },
};

export default example;

function getRandomColor(arr: string[]): string {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

function circle(
    context2D: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    start = 0,
    end = 2 * Math.PI
): CanvasRenderingContext2D {
    context2D.beginPath();
    context2D.arc(x, y, radius, start, end);
    context2D.closePath();
    return context2D;
}

function sin(
    context2D: CanvasRenderingContext2D,
    xOffset: number,
    yOffset: number,
    amplitude: number,
    frequency: number,
    tick = 5
): CanvasRenderingContext2D {
    const y = (x: number) => amplitude * Math.sin(x / frequency + xOffset) + yOffset;
    const {width} = context2D.canvas;
    context2D.beginPath();
    for (let x = -50; x < width + 50; x += tick) {
        if (x === -50) {
            context2D.moveTo(x, y(x));
        } else {
            context2D.lineTo(x, y(x));
        }
    }
    return context2D;
}
