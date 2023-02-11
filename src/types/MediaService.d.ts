import Auth from './Auth';
import type {IconName} from 'components/Icon';
import LibraryAction from './LibraryAction';
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
    readonly isScrobbler?: boolean;
    readonly defaultHidden?: boolean;
    readonly defaultNoScrobble?: boolean;
    readonly icons?: Partial<Record<LibraryAction, IconName>>;
    readonly labels?: Partial<Record<LibraryAction, string>>;
    canRate: (item: MediaObject, inline?: boolean) => boolean;
    canStore: (item: MediaObject, inline?: boolean) => boolean;
    compareForRating: <T extends MediaObject>(a: T, b: T) => boolean;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaPlaylist>;
    getMetadata?: <T extends MediaObject>(item: T) => Promise<T>;
    lookup?: (
        artist: string,
        title: string,
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
    rate?: (item: MediaObject, rating: number) => Promise<void>;
    store?: (item: MediaObject, stored: boolean) => Promise<void>;
}
