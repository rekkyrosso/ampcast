import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import {analyser, audioContext, observeAudioSourceNode, simpleAnalyser} from 'services/audio';
import OmniPlayer from 'services/players/OmniPlayer';
import {Logger} from 'utils';
import ambientVideoPlayer from './ambientVideoPlayer';
import ampshader from './ampshader';
import AudioMotion from './AudioMotion';
import Milkdrop from './Milkdrop';
import spotifyviz from './spotifyviz';
import Waveform from './Waveform';

console.log('module::visualizer/player');

const logger = new Logger('visualizer/player');

const audioMotion = new AudioMotion(audioContext, observeAudioSourceNode());
const milkdrop = new Milkdrop(analyser);
const waveform = new Waveform(simpleAnalyser);

const visualizers = [
    ampshader.player,
    audioMotion,
    milkdrop,
    spotifyviz.player,
    waveform,
    ambientVideoPlayer,
];

function selectVisualizer(visualizer: Visualizer): Player<Visualizer> | null {
    switch (visualizer.providerId) {
        case 'ambientvideo':
            return ambientVideoPlayer;

        case 'ampshader':
            return ampshader.player;

        case 'audiomotion':
            return audioMotion;

        case 'milkdrop':
            return milkdrop;

        case 'spotifyviz':
            return spotifyviz.player;

        case 'waveform':
            return waveform;

        default:
            return null;
    }
}

function loadVisualizer(player: Player<Visualizer>, visualizer: Visualizer): void {
    player.load(visualizer);
}

const visualizerPlayer = new OmniPlayer<Visualizer>(visualizers, selectVisualizer, loadVisualizer);

visualizerPlayer.loop = true;
visualizerPlayer.muted = true;
visualizerPlayer.volume = 0.07;

visualizerPlayer.observeError().subscribe(logger.error);

export default visualizerPlayer;
