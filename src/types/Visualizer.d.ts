import {Options as AudioMotionOptions} from 'audiomotion-analyzer';
import {SpotifyVizConfig} from 'services/visualizer/SpotifyViz';
import {WaveformConfig} from 'services/visualizer/Waveform';
import BaseVisualizer from './BaseVisualizer';

export type NoVisualizer = BaseVisualizer<'none'>;

export interface AmbientVideoVisualizer extends BaseVisualizer<'ambient-video'> {
    src: string;
}

export interface AmpshaderVisualizer extends BaseVisualizer<'ampshader'> {
    shader: string;
}

export interface AudioMotionVisualizer extends BaseVisualizer<'audiomotion'> {
    options: AudioMotionOptions;
}

export interface MilkdropVisualizer extends BaseVisualizer<'milkdrop'> {
    data: MilkdropRawData;
}

export interface SpotifyVizVisualizer extends BaseVisualizer<'spotify-viz'> {
    config: SpotifyVizConfig;
}

export interface WaveformVisualizer extends BaseVisualizer<'waveform'> {
    config: WaveformConfig;
}

type Visualizer =
    | NoVisualizer
    | AmbientVideoVisualizer
    | AmpshaderVisualizer
    | AudioMotionVisualizer
    | MilkdropVisualizer
    | SpotifyVizVisualizer
    | WaveformVisualizer;

export default Visualizer;
