import MediaItem from './MediaItem';

export default interface CreatePlaylistOptions<T extends MediaItem> {
    description?: string;
    items?: readonly T[];
    isPublic?: boolean;
    overWrite?: boolean; // Overwrite existing playlist.
}
