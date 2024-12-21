import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './ambientvideo';
import ampshader from './ampshader';
import audiomotion from './audiomotion';
import butterchurn from './butterchurn';
import coverart from './coverart';
import spotifyviz from './spotifyviz';
import waveform from './waveform';

const visualizers: VisualizerProvider[] = [
    ambientvideo,
    ampshader,
    audiomotion,
    butterchurn,
    coverart,
    spotifyviz,
    waveform
];

export default visualizers;
