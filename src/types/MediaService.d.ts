import Auth from './Auth';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
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
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaItem>;
    lookup?: (
        artist: string,
        title: string,
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
    rate?: (item: MediaObject, rating: number) => Promise<void>;
    canRate: (item: MediaObject | ItemType, inline?: boolean) => boolean;
}
