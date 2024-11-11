import {Except} from 'type-fest';
import PlaybackState from './PlaybackState';
import PlaylistItem from './PlaylistItem';
import Theme from './Theme';

export default interface Snapshot {
    readonly audio: {
        readonly replayGain: number;
        readonly settings: {
            readonly replayGain: {
                readonly mode: string;
                readonly preAmp: number;
            };
        };
        readonly streamingSupported: boolean;
        readonly volume: number;
    };
    readonly playback: {
        readonly isMiniPlayer: boolean;
        readonly isMiniPlayerRemote: boolean;
        readonly state: Except<PlaybackState, 'currentItem'> & {
            readonly currentItem: Pick<
                PlaylistItem,
                | 'src'
                | 'duration'
                | 'itemType'
                | 'mediaType'
                | 'playbackType'
                | 'lookupStatus'
                | 'startTime'
                | 'badge'
                | 'bitRate'
            > & {
                readonly blob: boolean;
                readonly blobUrl: boolean;
            } | null;
        };
        readonly volume: number;
    };
    readonly theme: Theme & {
        readonly edited: boolean;
        readonly fontSize: number;
        readonly userTheme: boolean;
    };
    readonly visualizer: {
        readonly current: {
            readonly name: string;
            readonly providerId: string;
        } | null;
        readonly provider: string;
    };
}
