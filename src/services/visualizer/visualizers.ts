import VisualizerComponents from 'types/VisualizerComponents';
import VisualizerProvider from 'types/VisualizerProvider';
import ambientvideo from './ambientvideo';
import ampshader from './ampshader';
import audiomotion from './audiomotion';
import butterchurn from './butterchurn';
import coverart from './coverart';
import waveform from './waveform';
import VisualizerSettings from './components/Settings/VisualizerSettings';

export const visualizers: VisualizerProvider[] = [
    ambientvideo,
    ampshader,
    audiomotion,
    butterchurn,
    coverart,
    waveform,
];

export const Components: VisualizerComponents = {
    Settings: VisualizerSettings,
};
