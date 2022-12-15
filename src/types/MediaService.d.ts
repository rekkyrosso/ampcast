import Auth from './Auth';
import MediaItem from './MediaItem';
import MediaServiceId from './MediaServiceId';
import MediaSource from './MediaSource';
import Pager, {PagerConfig} from './Pager';

export default interface MediaService extends Auth {
    readonly id: MediaServiceId;
    readonly title: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly roots: readonly MediaSource[];
    readonly sources: readonly MediaSource[];
    readonly scrobbler?: boolean;
    readonly defaultHidden?: boolean;
    readonly defaultNoScrobble?: boolean;
    lookup?: (artist: string, title: string, options?: Partial<PagerConfig>) => Pager<MediaItem>;
}
