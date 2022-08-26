import {SpotifyVizVisualizer} from 'types/Visualizer';
import example from './spotify-viz/example';

const presets: SpotifyVizVisualizer[] = [
    {
        provider: 'spotify-viz',
        name: 'example by zachwinter',
        config: example,
    },
];

export default presets;
