declare namespace SpotifyApi {
    interface PlaylistItemObject {
        added_at: string;
        added_by: UserObjectPublic;
        is_local: boolean;
        item: TrackObjectFull | null;
    }

    type PlaylistItemResponse = PagingObject<PlaylistItemObject>;
}
