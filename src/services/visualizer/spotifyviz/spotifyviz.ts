import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {SpotifyVizVisualizer} from 'types/Visualizer';
import SpotifyVizPlayer from './SpotifyVizPlayer';
import visualizers from './visualizers';

const spotifyviz: VisualizerProvider<SpotifyVizVisualizer> = {
    id: 'spotifyviz',
    name: 'spotify-viz',
    // 404 now (used to work)
    // externalUrl: 'https://github.com/zachwinter/spotify-viz/',
    visualizers,
    observeVisualizers: () => of(visualizers),
    createPlayer() {
        if (!this.player) {
            (this as any).player = new SpotifyVizPlayer();
        }
        return this.player!;
    },
};

export default spotifyviz;
