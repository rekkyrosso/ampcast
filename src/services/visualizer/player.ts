import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import {analyser, audioContext, observeAudioSourceNode, simpleAnalyser} from 'services/audio';
import OmniPlayer from 'services/OmniPlayer';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import {Logger} from 'utils';
import ambientVideoPlayer from './ambientVideoPlayer';
import AmpShader from './AmpShader';
import AudioMotion from './AudioMotion';
import Milkdrop from './Milkdrop';
import SpotifyViz from './SpotifyViz';
import Waveform from './Waveform';

console.log('module::visualizer/player');

const logger = new Logger('visualizer/player');

const ampshader = new AmpShader(simpleAnalyser);
const audioMotion = new AudioMotion(audioContext, observeAudioSourceNode());
const milkdrop = new Milkdrop(analyser);
const spotifyViz = new SpotifyViz(spotifyAudioAnalyser);
const waveform = new Waveform(simpleAnalyser);

const visualizers = [ampshader, audioMotion, milkdrop, spotifyViz, waveform, ambientVideoPlayer];

function selectVisualizer(visualizer: Visualizer): Player<Visualizer> | null {
    switch (visualizer.provider) {
        case 'ambient-video':
            return ambientVideoPlayer;

        case 'ampshader':
            return ampshader;

        case 'audiomotion':
            return audioMotion;

        case 'milkdrop':
            return milkdrop;

        case 'spotify-viz':
            return spotifyViz;

        case 'waveform':
            return waveform;

        default:
            return null;
    }
}

function loadVisualizer(player: Player<Visualizer>, visualizer: Visualizer): void {
    player.load(visualizer);
}

const player = new OmniPlayer<Visualizer>(
    visualizers,
    selectVisualizer,
    loadVisualizer
);

player.loop = true;
player.muted = true;
player.volume = 0.07;

player.observeError().subscribe(logger.error);

export default player;
