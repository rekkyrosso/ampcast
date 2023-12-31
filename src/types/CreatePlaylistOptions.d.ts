import PlaylistItem from './PlaylistItem';

export default interface CreatePlaylistOptions {
    description?: string;
    items?: readonly PlaylistItem[];
    isPublic?: boolean;
}
