import Auth from './Auth';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';
import MediaServiceId from './MediaServiceId';
import MediaSource from './MediaSource';
import {Pin} from './Pin';

export default interface MediaService extends Auth {
    readonly id: MediaServiceId;
    readonly name: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly roots: readonly MediaSource[];
    readonly sources: readonly MediaSource[];
    readonly scrobbler?: boolean;
    readonly defaultHidden?: boolean;
    readonly defaultNoScrobble?: boolean;
    canRate: (item: MediaObject, inline?: boolean) => boolean;
    canStore: (item: MediaObject, inline?: boolean) => boolean;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaPlaylist>;
    lookup?: (
        artist: string,
        title: string,
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
    rate?: (item: MediaObject, rating: number) => Promise<void>;
    store?: (item: MediaObject, stored: boolean) => Promise<void>;
}
