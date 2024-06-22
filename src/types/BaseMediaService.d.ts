import type {IconName} from 'components/Icon';
import Auth from './Auth';
import CreatePlaylistOptions from './CreatePlaylistOptions';
import DRMInfo from './DRMInfo';
import ItemType from './ItemType';
import LibraryAction from './LibraryAction';
import MediaItem from './MediaItem';
import MediaFilter from './MediaFilter';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';
import MediaService from './MediaService';
import MediaSource from './MediaSource';
import PlayableItem from './PlayableItem';
import PlaybackType from './PlaybackType';
import Pin from './Pin';
import ViewType from './ViewType';

type BaseMediaService = Auth & {
    readonly id: MediaServiceId;
    readonly name: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly roots: readonly MediaSource<MediaObject>[];
    readonly sources: readonly MediaSource<MediaObject>[];
    readonly disabled?: boolean;
    readonly defaultHidden?: boolean; // `true` for most services
    readonly internetRequired?: boolean;
    readonly authService?: MediaService; // Different `MediaService` for `Auth`
    readonly credentialsUrl?: string;
    readonly defaultNoScrobble?: boolean;
    readonly icons?: Partial<Record<LibraryAction, IconName>>;
    readonly labels?: Partial<Record<LibraryAction, string>>;
    readonly editablePlaylists?: MediaSource<MediaPlaylist>;
    readonly restrictedAccess?: boolean; // Approved users only (testers)
    addToPlaylist?: (
        playlist: MediaPlaylist,
        items: readonly MediaItem[],
        position?: number
    ) => Promise<void>;
    removeFromPlaylist?: (playlist: MediaPlaylist, items: readonly MediaItem[]) => Promise<void>;
    canRate: (item: MediaObject, inline?: boolean) => boolean;
    canStore: (item: MediaObject, inline?: boolean) => boolean;
    compareForRating: <T extends MediaObject>(a: T, b: T) => boolean;
    createPlaylist?: <T extends MediaItem>(
        name: string,
        options?: CreatePlaylistOptions<T>
    ) => Promise<MediaPlaylist>;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaPlaylist>;
    getDrmInfo?: (item?: PlayableItem) => DRMInfo | undefined;
    getFilters?: (
        viewType: ViewType.ByDecade | ViewType.ByGenre,
        itemType: ItemType
    ) => Promise<readonly MediaFilter[]>;
    getMetadata?: <T extends MediaObject>(item: T) => Promise<T>;
    getPlaybackType?: (item: MediaItem) => Promise<PlaybackType>;
    getPlayableUrl?: (item: PlayableItem) => string;
    getThumbnailUrl?: (url: string) => string;
    getTracksById?: (ids: readonly string[]) => Promise<readonly MediaItem[]>;
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
};

export default BaseMediaService;
