import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import {analyser, audioContext, observeAudioSourceNode} from 'services/audio';
import OmniPlayer from 'services/OmniPlayer';
import {Logger} from 'utils';
import ambientVideoPlayer from './ambientVideoPlayer';
import AmpShade from './AmpShade';
import AudioMotion from './AudioMotion';
import Milkdrop from './Milkdrop';
import SpotifyViz from './SpotifyViz';
import Waveform from './Waveform';

console.log('module::visualizer/player');

const logger = new Logger('visualizer/player');

const ampshade = new AmpShade(audioContext, analyser);
const audioMotion = new AudioMotion(audioContext, observeAudioSourceNode());
const milkdrop = new Milkdrop(analyser);
const spotifyViz = new SpotifyViz();
const waveform = new Waveform(analyser);

const visualizers = [ampshade, audioMotion, milkdrop, spotifyViz, waveform, ambientVideoPlayer];

function selectVisualizer(visualizer: Visualizer) {
    switch (visualizer.provider) {
        case 'ampshade':
            return ampshade;

        case 'audiomotion':
            return audioMotion;

        case 'milkdrop':
            return milkdrop;

        case 'video':
            return ambientVideoPlayer;

        case 'waveform':
            return waveform;

        case 'spotify-viz':
            return spotifyViz;

        default:
            return null;
    }
}

function loadVisualizer(player: Player<string>, visualizer: Visualizer) {
    player.load(visualizer.preset);
}

const visualizer = new OmniPlayer<Visualizer, string>(
    visualizers,
    selectVisualizer,
    loadVisualizer
);

visualizer.loop = true;
visualizer.muted = true;
visualizer.volume = 0.07;

export default visualizer;

visualizer.observeError().subscribe(logger.error);
visualizer.observePlaying().subscribe(logger.all('playing'));
visualizer.observeEnded().subscribe(logger.all('ended'));
