import {SpotifyVizVisualizer} from 'types/Visualizer';
import example from './example';

const visualizers: SpotifyVizVisualizer[] = [
    {
        providerId: 'spotifyviz',
        name: 'example by zachwinter',
        config: example,
        externalUrl: 'https://github.com/zachwinter/spotify-viz/blob/master/client/example.js',
    },
];

export default visualizers;

console.log('spotify-viz visualizers:', visualizers.length);
