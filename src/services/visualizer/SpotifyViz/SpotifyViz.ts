import VisualizerProvider from 'types/VisualizerProvider';
import {SpotifyVizVisualizer} from 'types/Visualizer';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import SpotifyVizPlayer from './SpotifyVizPlayer';
import presets from './presets';

const spotifyVizPlayer = new SpotifyVizPlayer(spotifyAudioAnalyser);

const spotifyviz: VisualizerProvider<SpotifyVizVisualizer> = {
    id: 'spotifyviz',
    name: 'spotify-viz',
    url: 'https://github.com/zachwinter/spotify-viz/',
    player: spotifyVizPlayer,
    visualizers: presets,
};

export default spotifyviz;
