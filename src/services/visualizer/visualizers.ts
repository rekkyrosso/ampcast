import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './ambientvideo';
import ampshader from './ampshader';
import audiomotion from './audiomotion';
import butterchurn from './butterchurn';
import coverart from './coverart';
import spotifyviz from './spotifyviz';
import waveform from './waveform';
import visualizerSettings from './visualizerSettings';

const visualizers: VisualizerProvider[] = [
    ambientvideo,
    ampshader,
    audiomotion,
    butterchurn,
    coverart,
];

if (visualizerSettings.spotifyEnabled) {
    visualizers.push(spotifyviz);
}

visualizers.push(waveform);

export default visualizers;
