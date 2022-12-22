import {SpotifyVizVisualizer} from 'types/Visualizer';
import example from './example';

const presets: SpotifyVizVisualizer[] = [
    {
        provider: 'spotify-viz',
        name: 'example by zachwinter',
        config: example,
        externalUrl: 'https://github.com/zachwinter/spotify-viz/blob/master/client/example.js',
    },
];

export default presets;
