import {Except} from 'type-fest';
import PlaybackState from './PlaybackState';
import PlaylistItem from './PlaylistItem';
import Theme from './Theme';

export default interface Snapshot {
    readonly playback: {
        readonly volume: number;
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
        readonly replayGain: {
            readonly mode: string;
            readonly preAmp: number;
        };
    };
    readonly visualizer: {
        readonly provider: string;
        readonly current: {
            readonly providerId: string;
            readonly name: string;
        } | null;
    };
    readonly theme: Theme & {
        readonly fontSize: number;
        readonly userTheme: boolean;
        readonly edited: boolean;
    };
}
