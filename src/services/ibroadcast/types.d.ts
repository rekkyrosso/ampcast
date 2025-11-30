declare namespace iBroadcast {
    interface Response {
        readonly result: boolean;
        readonly message?: string; // On error (result=false).
        readonly settings: {
            readonly artwork_server: string;
            readonly streaming_server: string;
        };
        readonly status: {
            readonly timestamp: string;
            readonly lastmodified: string;
        };
    }

    type LibraryEntry = readonly any[];
    type LibraryEntries = Record<string, LibraryEntry>;

    interface Tag {
        readonly name: string;
        readonly archived: boolean;
        readonly tracks: readonly string[];
    }

    type RateableLibrarySection = 'artists' | 'albums' | 'tracks';
    type LibrarySection = RateableLibrarySection | 'playlists';
    type LibrarySectionMap<T extends LibrarySection> = Library[T]['map'];
    type SystemPlaylistType = 'recently-played' | 'recently-uploaded' | 'thumbsup';

    interface Library {
        readonly expires: number; // unix time
        readonly artists: LibraryEntries & {
            readonly map: {
                readonly artwork_id: number;
                readonly icatid: number;
                readonly name: number;
                readonly rating: number;
                readonly tracks: number;
                readonly trashed: number;
            };
        };
        readonly albums: LibraryEntries & {
            readonly map: {
                readonly artist_id: number;
                readonly artists_additional: number;
                readonly artists_additional_map: {
                    readonly phrase: number;
                    readonly type: number;
                    readonly artist_id: number;
                };
                readonly disc: number;
                readonly icatid: number;
                readonly name: number;
                readonly rating: number;
                readonly tracks: number;
                readonly trashed: number;
                readonly year: number;
            };
        };
        readonly tracks: LibraryEntries & {
            readonly map: {
                readonly album_id: number;
                readonly artist_id: number;
                readonly artists_additional: number;
                readonly artists_additional_map: {
                    readonly phrase: number;
                    readonly type: number;
                    readonly artist_id: number;
                };
                readonly artwork_id: number;
                readonly enid: number;
                readonly file: number;
                readonly genre: number;
                readonly genres_additional: number;
                readonly icatid: number;
                readonly length: number;
                readonly path: number;
                readonly plays: number;
                readonly rating: number;
                readonly replay_gain: number;
                readonly size: number;
                readonly title: number;
                readonly track: number;
                readonly trashed: number;
                readonly type: number;
                readonly uid: number;
                readonly uploaded_on: number;
                readonly uploaded_time: number;
                readonly year: number;
            };
        };
        readonly playlists: LibraryEntries & {
            readonly map: {
                readonly artwork_id: number;
                readonly description: number;
                readonly name: number;
                readonly public_id: number;
                readonly sort: number;
                readonly system_created: number;
                readonly tracks: number;
                readonly type: number;
                readonly uid: number;
            };
        };
        readonly tags: Record<string, Tag>;
        readonly trash: LibraryEntries & {
            readonly map: {
                readonly name: number;
                readonly tracks: number;
            };
        };
    }

    interface LibraryResponse extends Response {
        readonly library: Library;
    }

    interface User {
        readonly id: string;
        readonly premium: boolean;
        readonly preferences: {
            readonly bitratepref: string; // Numeric (e.g. "128").
        };
    }

    interface StatusResponse extends Response {
        readonly authenticated: boolean;
        readonly user: User;
    }

    interface CreatePlaylistResponse extends StatusResponse {
        readonly playlist_id: number;
        readonly public_id: string;
    }

    interface AddToPlaylistResponse extends StatusResponse {
        readonly playlist_id: number;
        readonly tracks: readonly string[]; // Not `number`.
    }

    interface UpdatePlaylistResponse extends StatusResponse {
        readonly playlist: number;
        readonly tracks: readonly string[]; // Not `number`.
    }

    interface MakePlaylistPublicResponse extends StatusResponse {
        readonly public_id: string;
    }
}
