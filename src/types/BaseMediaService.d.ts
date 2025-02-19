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
import MediaSource, {AnyMediaSource} from './MediaSource';
import PlayableItem from './PlayableItem';
import PlaybackType from './PlaybackType';
import Pin from './Pin';

type BaseMediaService = Auth & {
    readonly id: MediaServiceId;
    readonly name: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly defaultHidden: boolean; // `true` for most services
    compareForRating: <T extends MediaObject>(a: T, b: T) => boolean;
    // Everything below here should be optional.
    readonly root?: AnyMediaSource;
    readonly sources?: readonly AnyMediaSource[];
    readonly listingName?: string; // Longer name for disambiguation
    readonly internetRequired?: boolean;
    readonly credentialsLocked?: boolean;
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
    // For services that play audio in an iframe.
    readonly iframeAudioPlayback?:
        | {
              readonly showContent?: false | undefined;
              readonly showCoverArt?: boolean; // Show CoverArt visualizer instead.
          }
        | {
              readonly showContent: true;
              readonly isCoverArt?: boolean; // Shows enough metadata to not require a hover state.
          };
    addMetadata?: <T extends MediaObject>(item: T) => Promise<T>;
    addToPlaylist?: (
        playlist: MediaPlaylist,
        items: readonly MediaItem[],
        position?: number
    ) => Promise<void>;
    removeFromPlaylist?: (playlist: MediaPlaylist, items: readonly MediaItem[]) => Promise<void>;
    canRate?: (item: MediaObject, inline?: boolean) => boolean;
    canStore?: (item: MediaObject, inline?: boolean) => boolean;
    createPlaylist?: <T extends MediaItem>(
        name: string,
        options?: CreatePlaylistOptions<T>
    ) => Promise<MediaPlaylist>;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaPlaylist>;
    getDrmInfo?: (item?: PlayableItem) => DRMInfo | undefined;
    getDroppedItems?: (
        type: DataTransferItem['type'],
        data: string
    ) => Promise<readonly MediaItem[]>;
    getFilters?: (filterType: FilterType, itemType: ItemType) => Promise<readonly MediaFilter[]>;
    getMediaObject?: <T extends MediaObject>(src: string) => Promise<T>;
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
