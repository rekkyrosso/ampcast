import type React from 'react';
import type {IconName} from 'components/Icon';
import Auth from './Auth';
import CreatePlaylistOptions from './CreatePlaylistOptions';
import DRMInfo from './DRMInfo';
import FilterType from './FilterType';
import ItemType from './ItemType';
import LibraryAction from './LibraryAction';
import MediaFilter from './MediaFilter';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';
import MediaService from './MediaService';
import MediaSource, {AnyMediaSource, AnyMediaSources} from './MediaSource';
import PlayableItem from './PlayableItem';
import PlaybackType from './PlaybackType';
import Pin from './Pin';

type BaseMediaService = Auth & {
    readonly id: MediaServiceId;
    readonly name: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly root: AnyMediaSource;
    readonly sources: AnyMediaSources;
    canRate: (item: MediaObject, inline?: boolean) => boolean;
    canStore: (item: MediaObject, inline?: boolean) => boolean;
    compareForRating: <T extends MediaObject>(a: T, b: T) => boolean;
    // Everything below here should be optional.
    readonly listingName?: string; // Longer name for disambiguation
    readonly disabled?: boolean;
    readonly defaultHidden?: boolean; // `true` for most services
    readonly internetRequired?: boolean;
    readonly authService?: MediaService; // Different `MediaService` for `Auth`
    readonly credentialsRequired?: boolean;
    readonly credentialsUrl?: string;
    readonly restrictedAccess?: boolean; // Approved users only (testers)
    readonly defaultNoScrobble?: boolean;
    readonly icons?: Partial<Record<LibraryAction, IconName>>;
    readonly labels?: Partial<Record<LibraryAction, string>>;
    readonly editablePlaylists?: MediaSource<MediaPlaylist>;
    readonly Components?: {
        Credentials?: React.FC<{service: MediaService}>;
        Login?: React.FC<{service: MediaService}>;
    };
    addToPlaylist?: (
        playlist: MediaPlaylist,
        items: readonly MediaItem[],
        position?: number
    ) => Promise<void>;
    removeFromPlaylist?: (playlist: MediaPlaylist, items: readonly MediaItem[]) => Promise<void>;
    createPlaylist?: <T extends MediaItem>(
        name: string,
        options?: CreatePlaylistOptions<T>
    ) => Promise<MediaPlaylist>;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaPlaylist>;
    getDrmInfo?: (item?: PlayableItem) => DRMInfo | undefined;
    getDroppedItems?: <T extends MediaObject>(data: DataTransferItem) => Promise<readonly T[]>;
    getFilters?: (filterType: FilterType, itemType: ItemType) => Promise<readonly MediaFilter[]>;
    getMetadata?: <T extends MediaObject>(item: T) => Promise<T>;
    getPlaybackType?: (item: MediaItem) => Promise<PlaybackType>;
    getPlayableUrl?: (item: PlayableItem) => string;
    getThumbnailUrl?: (url: string) => string;
    lookup?: (
        artist: string,
        title: string,
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
    lookupByISRC?: (
        isrcs: readonly string[],
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
    rate?: (item: MediaObject, rating: number) => Promise<void>;
    bulkRate?: (items: readonly MediaObject[], rating: number) => Promise<void>;
    store?: (item: MediaObject, inLibrary: boolean) => Promise<void>;
    bulkStore?: (items: readonly MediaObject[], inLibrary: boolean) => Promise<void>;
    scrobble?: () => void;
};

export default BaseMediaService;
