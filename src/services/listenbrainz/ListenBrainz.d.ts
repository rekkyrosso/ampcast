declare namespace ListenBrainz {
    type MusicService =
        | 'spotify.com'
        | 'bandcamp.com'
        | 'youtube.com'
        | 'music.youtube.com'
        | 'deezer.com'
        | 'tidal.com'
        | 'music.apple.com'
        | 'archive.org'
        | 'soundcloud.com'
        | 'jamendo.com'
        | 'play.google.com'
        ;

    // Timestamps are in Unix time.

    interface TrackMetadata {
        artist_name: string;
        track_name: string;
        release_name?: string;
        additional_info?: {
            artist_msid: string | null;
            artist_names?: string[];
            discnumber?: number;
            duration?: number;
            duration_ms?: number;
            isrc?: string;
            music_service?: MusicService;
            origin_url?: string;
            recording_msid: string | null;
            release_artist_name?: string;
            release_artist_names?: string[];
            release_msid: string | null;
            lastfm_artist_mbid?: string;
            lastfm_release_mbid?: string;
            lastfm_track_mbid?: string;
            spotify_album_artist_ids?: string[];
            spotify_album_id?: string;
            spotify_artist_ids?: string[];
            spotify_id?: string;
            submission_client?: string;
            tracknumber?: number;
        };
        mbid_mapping?: {
            artist_mbids: string[];
            release_mbid: string;
            recording_mbid: string;
        };
    }

    interface Listen {
        inserted_at: number;
        listened_at: number;
        recording_msid: string | null;
        track_metadata: TrackMetadata;
        user_name: string;
    }

    interface Artist {
        artist_mbids: string[];
        artist_msid: string | null;
        artist_name: string;
        listen_count: number;
    }

    interface Release extends Artist {
        release_mbid: string;
        release_msid: string | null;
        release_name: string;
    }

    interface Recording extends Release {
        recording_mbid: string;
        recording_msid: string | null;
        track_name: string;
    }

    namespace User {
        interface Listens {
            payload: {
                count: 25;
                latest_listen_ts: number;
                listens: Listen[];
                user_name: string;
            };
        }
    }

    namespace Stats {
        interface BasePayload {
            count: number;
            from_ts: number;
            last_updated: number;
            offset: number;
            range: string;
            to_ts: number;
            user_id: string;
        }

        interface Artists {
            payload: BasePayload & {
                artists: Artist[];
                total_artist_count: number;
            };
        }

        interface Releases {
            payload: BasePayload & {
                releases: Release[];
                total_release_count: number;
            };
        }

        interface Recordings {
            payload: BasePayload & {
                recordings: Recording[];
                total_recording_count: number;
            };
        }
    }
}
