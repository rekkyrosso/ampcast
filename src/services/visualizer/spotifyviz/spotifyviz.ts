import {of} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {SpotifyVizVisualizer} from 'types/Visualizer';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import SpotifyVizPlayer from './SpotifyVizPlayer';
import visualizers from './visualizers';

const spotifyVizPlayer = new SpotifyVizPlayer(spotifyAudioAnalyser);

const spotifyviz: VisualizerProvider<SpotifyVizVisualizer> = {
    id: 'spotifyviz',
    name: 'spotify-viz',
    externalUrl: 'https://github.com/zachwinter/spotify-viz/',
    player: spotifyVizPlayer,
    visualizers,
    observeVisualizers: () => of(visualizers),
};

export default spotifyviz;
