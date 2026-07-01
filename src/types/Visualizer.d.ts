import type React from 'react';
import type {Options as AudioMotionOptions} from 'audiomotion-analyzer';
import type {SpotifyVizConfig} from 'services/visualizer/spotifyviz/SpotifyVizPlayer';
import type {WaveformConfig} from 'services/visualizer/waveform/WaveformPlayer';
import BaseVisualizer from './BaseVisualizer';
import MediaItem from './MediaItem';
import NextVisualizerReason from './NextVisualizerReason';
import VisualizerProviderId from './VisualizerProviderId';

export interface NoVisualizer extends BaseVisualizer {
    readonly providerId: 'none';
    readonly name: '' | 'not loaded' | 'not supported' | 'error';
    // Link to the visualizer that isn't working.
    readonly link: {
        readonly providerId: VisualizerProviderId;
        readonly name?: string;
    };
}

interface AmbientVideo extends BaseVisualizer {
    readonly providerId: 'ambientvideo';
}

export type AmbientVideoVisualizer = AmbientVideo & MediaItem;

export interface AmpShaderVisualizer extends BaseVisualizer {
    readonly providerId: 'ampshader';
    readonly shader: string;
}

export interface AudioMotionVisualizer extends BaseVisualizer {
    readonly providerId: 'audiomotion';
    readonly options: AudioMotionOptions;
}

export interface ButterchurnVisualizer extends BaseVisualizer {
    readonly providerId: 'butterchurn';
    readonly data: MilkdropRawData;
}

export interface CoverArtVisualizer extends BaseVisualizer {
    readonly providerId: 'coverart';
    readonly component: React.FC;
}

export interface SpotifyVizVisualizer extends BaseVisualizer {
    readonly providerId: 'spotifyviz';
    readonly config: SpotifyVizConfig;
}

export interface WaveformVisualizer extends BaseVisualizer {
    readonly providerId: 'waveform';
    readonly config: WaveformConfig;
}

export interface VisualizerReason {
    readonly reason?: NextVisualizerReason;
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

export type NextVisualizer = Visualizer & VisualizerReason;
