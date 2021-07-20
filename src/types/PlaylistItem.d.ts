import MediaItem from './MediaItem';

export default interface PlaylistItem extends MediaItem {
    readonly id: string;
}
