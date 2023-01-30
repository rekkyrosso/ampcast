declare namespace ListenBrainz {
    // Timestamps are in Unix time.

    interface ListensSubmission {
        listen_type: 'single' | 'import';
        payload: ListenPayload[];
    }

    interface ListensSubmission {
        listen_type: 'playing_now';
        payload: Omit<ListenPayload, 'listened_at'>[];
    }

    interface ListenPayload {
        listened_at: number;
        track_metadata: ListenMetadata;
    }

    interface ListenMetadata {
        artist_name: string;
        track_name: string;
        release_name?: string;
        additional_info?: {
            artist_mbids?: string[];
            release_group_mbid?: string;
            release_mbid?: string;
            recording_mbid?: string;
            track_mbid?: string;
            work_mbids?: string[];
            tracknumber?: number;
            discnumber?: number;
            duration?: number;
            duration_ms?: number;
            isrc?: string;
            spotify_id?: string;
            tags?: string[];
            media_player?: string;
            media_player_version?: string;
            submission_client?: string;
            submission_client_version?: string;
            music_service?: string;
            music_service_name?: string;
            origin_url?: string;
        };
    }

    interface TrackMetadata {
        artist_name: string;
        track_name: string;
        release_name?: string;
        additional_info?: {
            artist_msid?: string | null;
            artist_names?: string[];
            track_number?: number;
            tracknumber?: number;
            discnumber?: number;
            duration?: number;
            duration_ms?: number;
            isrc?: string;
            origin_url?: string;
            recording_msid?: string | null;
            release_artist_name?: string;
            release_artist_names?: string[];
            release_msid?: string | null;
            lastfm_artist_mbid?: string;
            lastfm_release_mbid?: string;
            lastfm_track_mbid?: string;
            spotify_album_artist_ids?: string[];
            spotify_album_id?: string;
            spotify_artist_ids?: string[];
            spotify_id?: string;
            music_service?: string;
            music_service_name?: string;
            media_player?: string;
            media_player_version?: string;
            submission_client?: string;
            submission_client_version?: string;
            brainzplayer_metadata?: {
                artist_name: string;
                track_name: string;
                release_name?: string;
            };
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
        interface ListenCount {
            payload: {
                count: number;
            };
        }

        interface ListensParams {
            count?: number;
            min_ts?: number;
            max_ts?: number;
        }

        interface Listens {
            payload: {
                count: number;
                latest_listen_ts: number;
                listens: Listen[];
                user_name: string;
            };
        }

        interface Feedback {
            created: number; // timestamp (UNIX)
            recording_mbid: string;
            recording_msid: string;
            score: number;
            track_metadata: TrackMetadata;
            user_id: string;
        }

        interface UserFeedbackResponse {
            count: number;
            feedback: readonly Feedback[];
            offset: number;
            total_count: number;
        }

        interface UserRecordingsFeedbackResponse {
            feedback: readonly Feedback[];
            user_name: string;
        }
    }

    namespace Stats {
        interface MediaPayload {
            count: number;
            from_ts: number;
            last_updated: number;
            offset: number;
            range: string;
            to_ts: number;
            user_id: string;
        }

        interface Artists {
            payload: MediaPayload & {
                artists: Artist[];
                total_artist_count: number;
            };
        }

        interface Releases {
            payload: MediaPayload & {
                releases: Release[];
                total_release_count: number;
            };
        }

        interface Recordings {
            payload: MediaPayload & {
                recordings: Recording[];
                total_recording_count: number;
            };
        }

        type Response = Artists | Releases | Recordings;

        interface ListeningActivity {
            listen_count: number;
            time_range: string;
            from_ts: number;
            to_ts: number;
        }

        interface ListeningActivityParams {
            range?: string;
        }

        interface ListeningActivityResponse {
            payload: {
                from_ts: number;
                last_updated: number;
                listening_activity: ListeningActivity[];
                range: string;
                to_ts: number;
                user_id: string;
            };
        }
    }
}
