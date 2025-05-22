declare namespace ListenBrainz {
    // Timestamps are in Unix time.

    interface ListensSubmission {
        readonly listen_type: 'single' | 'import';
        readonly payload: readonly ListenPayload[];
    }

    interface ListensSubmission {
        readonly listen_type: 'playing_now';
        readonly payload: Omit<ListenPayload, 'listened_at'>[];
    }

    interface ListenPayload {
        readonly listened_at: number;
        readonly track_metadata: ListenMetadata;
    }

    interface ListenMetadata {
        readonly artist_name: string;
        readonly track_name: string;
        readonly release_name?: string;
        readonly additional_info?: {
            readonly artist_mbids?: readonly string[];
            readonly release_group_mbid?: readonly string;
            readonly release_mbid?: string;
            readonly recording_mbid?: string;
            readonly track_mbid?: string;
            readonly work_mbids?: readonly string[];
            readonly tracknumber?: number;
            readonly discnumber?: number;
            readonly duration?: number;
            readonly duration_ms?: number;
            readonly isrc?: string;
            readonly spotify_id?: string;
            readonly tags?: string[];
            readonly media_player?: string;
            readonly media_player_version?: string;
            readonly submission_client?: string;
            readonly submission_client_version?: string;
            readonly music_service?: string;
            readonly music_service_name?: string;
            readonly origin_url?: string;
        };
    }

    interface TrackMetadata {
        readonly artist_name: string;
        readonly track_name: string;
        readonly release_name?: string;
        readonly additional_info?: {
            readonly artist_msid?: string | null;
            readonly artist_names?: readonly string[];
            readonly track_number?: number;
            readonly tracknumber?: number;
            readonly discnumber?: number;
            readonly duration?: number;
            readonly duration_ms?: number;
            readonly isrc?: string;
            readonly origin_url?: string;
            readonly recording_msid?: string | null;
            readonly release_artist_name?: string;
            readonly release_artist_names?: readonly string[];
            readonly release_msid?: string | null;
            readonly lastfm_artist_mbid?: string;
            readonly lastfm_release_mbid?: string;
            readonly lastfm_track_mbid?: string;
            readonly spotify_album_artist_ids?: readonly string[];
            readonly spotify_album_id?: string;
            readonly spotify_artist_ids?: readonly string[];
            readonly spotify_id?: string;
            readonly music_service?: string;
            readonly music_service_name?: string;
            readonly media_player?: string;
            readonly media_player_version?: string;
            readonly submission_client?: string;
            readonly submission_client_version?: string;
            readonly brainzplayer_metadata?: {
                readonly artist_name: string;
                readonly track_name: string;
                readonly release_name?: string;
            };
        };
        readonly mbid_mapping?: {
            readonly artist_mbids: readonly string[];
            readonly caa_release_mbid: string;
            readonly release_mbid: string;
            readonly recording_mbid: string;
        };
    }

    interface LookupMetadata {
        readonly artist_credit_name: string;
        readonly recording_name: string;
        readonly release_name: string;
        readonly artist_mbids: readonly string[];
        readonly release_mbid: string;
        readonly recording_mbid: string;
    }

    interface Listen {
        readonly inserted_at: number;
        readonly listened_at: number;
        readonly recording_msid: string | null;
        readonly track_metadata: TrackMetadata;
        readonly user_name: string;
    }

    interface Artist {
        readonly artist_mbids: readonly string[];
        readonly artist_msid: string | null;
        readonly artist_name: string;
        readonly listen_count: number;
    }

    interface Release extends Artist {
        readonly caa_release_mbid: string;
        readonly release_mbid: string;
        readonly release_msid: string | null;
        readonly release_name: string;
    }

    interface Recording extends Release {
        readonly recording_mbid: string | null;
        readonly recording_msid: string | null;
        readonly release_name: string | null;
        readonly track_name: string;
    }

    interface Playlist {
        readonly annotation: string;
        readonly creator: string;
        readonly date: string;
        readonly identifier: string;
        readonly title: string;
        readonly extension: {
            'https://musicbrainz.org/doc/jspf#playlist': {
                readonly creator: string;
                readonly last_modified_at: string; // ISO
                readonly public: boolean;
            };
        };
    }

    interface PlaylistItem {
        readonly id: string;
        readonly creator: string;
        readonly identifier: string;
        readonly title: string;
        readonly album?: string;
        readonly extension: {
            'https://musicbrainz.org/doc/jspf#track': {
                readonly added_at: string;
                readonly added_by: string;
                readonly additional_metadata: {
                    readonly artists?: readonly ArtistsMetadata[];
                    readonly caa_id: number;
                    readonly caa_release_mbid: string;
                };
                readonly artist_identifiers: readonly string[];
                readonly release_identifier: string;
            };
        };
    }

    interface ArtistsMetadata {
        readonly artist_credit_name: string;
        readonly artist_mbid: string;
        readonly join_phrase: string;
    }

    interface PlaylistItemsResponse {
        readonly playlist: Playlist & {
            readonly track: readonly PlaylistItem[];
        };
    }

    namespace User {
        interface ListenCount {
            readonly payload: {
                readonly count: number;
            };
        }

        interface ListensParams {
            readonly count?: number;
            readonly min_ts?: number;
            readonly max_ts?: number;
        }

        interface Listens {
            readonly payload: {
                readonly count: number;
                readonly latest_listen_ts: number;
                readonly oldest_listen_ts: number;
                readonly listens: readonly Listen[];
                readonly user_name: string;
            };
        }

        interface Feedback {
            readonly created: number; // timestamp (UNIX)
            readonly recording_mbid: string;
            readonly recording_msid: string;
            readonly score: number;
            readonly track_metadata: TrackMetadata | null;
            readonly user_id: string;
        }

        interface UserFeedbackResponse {
            readonly count: number;
            feedback: readonly Feedback[];
            readonly offset: number;
            readonly total_count: number;
        }

        interface UserRecordingsFeedbackResponse {
            readonly feedback: readonly Feedback[];
            readonly user_name: string;
        }

        interface PlaylistsResponse {
            readonly count: number;
            readonly playlists: readonly {playlist: Playlist}[];
            readonly offset: number;
            readonly playlist_count: number;
        }

        interface FreshReleases {
            readonly payload: {
                readonly releases: readonly FreshRelease[];
                readonly user_name: string;
            };
        }

        interface FreshRelease {
            readonly artist_credit_name: string;
            readonly artist_mbids: readonly string[];
            readonly confidence: number;
            readonly listen_count: number;
            readonly caa_id: string;
            readonly caa_release_mbid: string;
            readonly release_date: string;
            readonly release_mbid: string;
            readonly release_msid: string | null;
            readonly release_name: string;
        }
    }

    namespace Stats {
        interface MediaPayload {
            readonly count: number;
            readonly from_ts: number;
            readonly last_updated: number;
            readonly offset: number;
            readonly range: string;
            readonly to_ts: number;
            readonly user_id: string;
        }

        interface Artists {
            readonly payload: MediaPayload & {
                readonly artists: readonly Artist[];
                readonly total_artist_count: number;
            };
        }

        interface Releases {
            readonly payload: MediaPayload & {
                readonly releases: readonly Release[];
                readonly total_release_count: number;
            };
        }

        interface Recordings {
            readonly payload: MediaPayload & {
                readonly recordings: readonly Recording[];
                readonly total_recording_count: number;
            };
        }

        type Response = Artists | Releases | Recordings;

        interface ListeningActivity {
            readonly listen_count: number;
            readonly time_range: string;
            readonly from_ts: number;
            readonly to_ts: number;
        }

        interface ListeningActivityParams {
            readonly range?: string;
        }

        interface ListeningActivityResponse {
            readonly payload: {
                readonly from_ts: number;
                readonly last_updated: number;
                readonly listening_activity: readonly ListeningActivity[];
                readonly range: string;
                readonly to_ts: number;
                readonly user_id: string;
            };
        }
    }
}
