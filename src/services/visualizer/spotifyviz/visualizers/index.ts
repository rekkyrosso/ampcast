import {SpotifyVizVisualizer} from 'types/Visualizer';
import example from './example';

const visualizers: SpotifyVizVisualizer[] = [
    {
        providerId: 'spotifyviz',
        name: 'example by zachwinter',
        config: example,
        // Dead link.
        // externalUrl: 'https://github.com/zachwinter/spotify-viz/blob/master/client/example.js',
    },
];

export default visualizers;
