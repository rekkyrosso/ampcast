import {AudioMotionVisualizer} from 'types/Visualizer';

const providerId = 'audiomotion'

// From: https://audiomotion.dev/demo/fluid.js
const visualizers: AudioMotionVisualizer[] = [
    {
        providerId,
        name: 'Anemone',
        options: {
            radial: true,
            ledBars: false,
            spinSpeed: 1,
            mode: 8,
            barSpace: 0,
            gradient: 'ampcast-rainbow',
            reflexRatio: 0.4,
            showPeaks: true,
            mirror: -1,
            maxFreq: 8000,
            lineWidth: 2,
            fillAlpha: 0.2,
        },
    },
    {
        providerId,
        name: 'Classic LEDs',
        options: {
            mode: 7,
            barSpace: 0,
            gradient: 'ampcast-classic',
            ledBars: true,
            lumiBars: false,
            radial: false,
            reflexRatio: 0,
            showPeaks: true,
        },
    },
    {
        providerId,
        name: 'Mirror wave',
        options: {
            mode: 10,
            fillAlpha: 0.6,
            gradient: 'ampcast-rainbow',
            lineWidth: 2,
            mirror: -1,
            radial: false,
            reflexAlpha: 1,
            reflexBright: 1,
            reflexRatio: 0.5,
            showPeaks: false,
        },
    },
    {
        providerId,
        name: 'Radial overlay',
        options: {
            mode: 5,
            barSpace: 0.1,
            gradient: 'ampcast-prism',
            radial: true,
            ledBars: false,
            showPeaks: true,
            spinSpeed: 1,
        },
    },
    {
        providerId,
        name: 'Reflex Bars',
        options: {
            mode: 5,
            barSpace: 0.25,
            // gradient: 'rainbow',
            gradient: 'ampcast-prism',
            lumiBars: false,
            radial: false,
            reflexAlpha: 0.25,
            reflexBright: 1,
            reflexFit: true,
            reflexRatio: 0.3,
            ledBars: false,
            showPeaks: true,
        },
    },
];

export default visualizers;
