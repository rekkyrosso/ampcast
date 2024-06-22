import type React from 'react';
import type {Options as AudioMotionOptions} from 'audiomotion-analyzer';
import type {SpotifyVizConfig} from 'services/visualizer/spotifyviz/SpotifyVizPlayer';
import type {WaveformConfig} from 'services/visualizer/waveform/WaveformPlayer';
import BaseVisualizer from './BaseVisualizer';

export interface NoVisualizer extends BaseVisualizer {
    providerId: 'none';
    reason?: 'not loaded' | 'not supported' | 'error';
}

export interface AmbientVideoVisualizer extends BaseVisualizer {
    providerId: 'ambientvideo';
    src: string;
}

export interface AmpShaderVisualizer extends BaseVisualizer {
    providerId: 'ampshader';
    shader: string;
}

export interface AudioMotionVisualizer extends BaseVisualizer {
    providerId: 'audiomotion';
    options: AudioMotionOptions;
}

export interface ButterchurnVisualizer extends BaseVisualizer {
    providerId: 'butterchurn';
    data: MilkdropRawData;
}

export interface CoverArtVisualizer extends BaseVisualizer {
    providerId: 'coverart';
    component: React.FC;
}

export interface SpotifyVizVisualizer extends BaseVisualizer {
    providerId: 'spotifyviz';
    config: SpotifyVizConfig;
}

export interface WaveformVisualizer extends BaseVisualizer {
    providerId: 'waveform';
    config: WaveformConfig;
}

type Visualizer =
    | NoVisualizer
    | AmbientVideoVisualizer
    | AmpShaderVisualizer
    | AudioMotionVisualizer
    | ButterchurnVisualizer
    | CoverArtVisualizer
    | SpotifyVizVisualizer
    | WaveformVisualizer;

export default Visualizer;
