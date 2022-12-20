import { AudioMotionVisualizer } from 'types/Visualizer';

const externalUrl = 'https://audiomotion.dev/';

// From: https://audiomotion.dev/demo/fluid.js
const presets: AudioMotionVisualizer[] = [
    {
        provider: 'audiomotion',
        name: 'Anemone',
        options: {
            radial: true,
            ledBars: false,
            spinSpeed: 1,
            mode: 8,
            barSpace: 0,
            // gradient: 'my-grad',
            gradient: 'rainbow',
            reflexRatio: 0.4,
            showPeaks: true,
            mirror: -1,
            maxFreq: 8000,
            lineWidth: 2,
            fillAlpha: 0.2,
        },
        externalUrl,
    },
    {
        provider: 'audiomotion',
        name: 'Classic LEDs',
        options: {
            mode: 7,
            barSpace: 0,
            // gradient: 'my-grad',
            gradient: 'classic',
            ledBars: true,
            lumiBars: false,
            radial: false,
            reflexRatio: 0,
            showPeaks: true,
        },
        externalUrl,
    },
    {
        provider: 'audiomotion',
        name: 'Mirror wave',
        options: {
            mode: 10,
            fillAlpha: 0.6,
            // gradient: 'my-grad',
            gradient: 'rainbow',
            lineWidth: 2,
            mirror: -1,
            radial: false,
            reflexAlpha: 1,
            reflexBright: 1,
            reflexRatio: 0.5,
            showPeaks: false,
        },
        externalUrl,
    },
    {
        provider: 'audiomotion',
        name: 'Radial overlay',
        options: {
            mode: 5,
            barSpace: 0.1,
            // gradient: 'my-grad',
            gradient: 'prism',
            radial: true,
            ledBars: false,
            showPeaks: true,
            spinSpeed: 1,
        },
        externalUrl,
    },
    {
        provider: 'audiomotion',
        name: 'Reflex Bars',
        options: {
            mode: 5,
            barSpace: 0.25,
            // gradient: 'my-grad',
            gradient: 'rainbow',
            lumiBars: false,
            radial: false,
            reflexAlpha: 0.25,
            reflexBright: 1,
            reflexFit: true,
            reflexRatio: 0.3,
            ledBars: false,
            showPeaks: true,
        },
        externalUrl,
    },
];

export default presets;
