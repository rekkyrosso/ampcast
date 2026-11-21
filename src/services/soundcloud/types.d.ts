// Modified from: https://github.com/twin-paws/soundcloud-api-ts

declare namespace SoundCloud {
    /**
     * OAuth 2.1 token response returned by SoundCloud's `/oauth/token` endpoint.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/oauth2/post_oauth2_token
     */
    interface Token {
        /** The OAuth 2.1 access token used to authenticate API requests */
        readonly access_token: string;
        /** Number of seconds until the access token expires */
        readonly expires_in: number;
        /** Token used to obtain a new access token when the current one expires */
        readonly refresh_token: string;
        /** OAuth scope granted (e.g. "*" for full access) */
        readonly scope: string;
        /** Token type, typically "bearer" */
        readonly token_type: string;
    }

    /**
     * Represents a SoundCloud user profile.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/users/get_users__user_id_
     */
    interface User {
        /** URL to the user's avatar image */
        readonly avatar_url: string;
        /** The user's city (may be empty string if not set) */
        readonly city: string;
        /** The user's country (may be empty string if not set) */
        readonly country: string;
        /** ISO 8601 timestamp of when the user account was created */
        readonly created_at: string;
        /** The user's profile description / bio */
        readonly description: string;
        /** The user's Discogs username, or null if not set */
        readonly discogs_name: string | null;
        /** The user's first name */
        readonly first_name: string;
        /** Total number of followers */
        readonly followers_count: number;
        /** Total number of users this user is following */
        readonly followings_count: number;
        /** The user's full name (first + last) */
        readonly full_name: string;
        /** The user's unique numeric ID on SoundCloud */
        readonly id: number;
        /** URN identifier (e.g. "soundcloud:users:123") */
        readonly urn: string;
        /** Resource type, always "user" */
        readonly kind: 'user';
        /** ISO 8601 timestamp of the last profile modification */
        readonly last_modified: string;
        /** The user's last name */
        readonly last_name: string;
        /** Total number of public likes (favorites) */
        readonly likes_count: number;
        /** Whether the user is currently online */
        readonly online: boolean;
        /** URL-friendly slug for the user's profile (e.g. "artist-name") */
        readonly permalink: string;
        /** Full URL to the user's SoundCloud profile page */
        readonly permalink_url: string;
        /** The user's subscription plan (e.g. "Free", "Pro") */
        readonly plan: string;
        /** Total number of public playlists */
        readonly playlist_count: number;
        /** Total number of public favorites */
        readonly public_favorites_count: number;
        /** Total number of reposts */
        readonly reposts_count: number;
        /** The user's active subscriptions */
        readonly subscriptions: Subscription[];
        /** Total number of public tracks */
        readonly track_count: number;
        /** API resource URI for this user */
        readonly uri: string;
        /** The user's display name */
        readonly username: string;
        /** The user's website URL, or null if not set */
        readonly website: string | null;
        /** Display title for the user's website, or null if not set */
        readonly website_title: string | null;
        /**
         * Comment count for this user.
         * @deprecated Always returns 0 in current API responses.
         */
        readonly comments_count: number;
        /** The user's Myspace username, or null if not set */
        readonly myspace_name: string | null;
    }

    /**
     * Extended user profile returned by the `/me` endpoint, including private account details.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/me/get_me
     */
    interface Me extends User {
        /** The user's locale setting (e.g. "en"), or null if not set */
        readonly locale: string | null;
        /** Whether the user's primary email address has been confirmed */
        readonly primary_email_confirmed: boolean;
        /** Number of private (unlisted) playlists */
        readonly private_playlists_count: number;
        /** Number of private (unlisted) tracks */
        readonly private_tracks_count: number;
        /** Upload quota information for the authenticated user */
        readonly quota: Quota;
        /** Remaining upload time in seconds, or null if unlimited */
        readonly upload_seconds_left: number | null;
    }

    /**
     * Upload quota details for the authenticated user.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/me/get_me
     */
    interface Quota {
        /** Whether the user has an unlimited upload quota (e.g. Pro plan) */
        readonly unlimited_upload_quota: boolean;
        /** Total upload time consumed in seconds */
        readonly upload_seconds_used: number;
        /** Remaining upload time in seconds, or null if unlimited */
        readonly upload_seconds_left: number | null;
    }

    /**
     * A subscription associated with a SoundCloud user account.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/users
     */
    interface Subscription {
        /** The subscription product details */
        readonly product: Product;
        /** Whether the subscription auto-renews (may be absent) */
        readonly recurring?: boolean;
    }

    /**
     * Product details for a SoundCloud subscription.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/users
     */
    interface Product {
        /** Unique product identifier (e.g. "creator-pro-unlimited") */
        readonly id: string;
        /** Human-readable product name (e.g. "Pro Unlimited") */
        readonly name: string;
    }

    /**
     * Represents a SoundCloud track (audio upload).
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/tracks/get_tracks__track_id_
     */
    interface Track {
        /**
         * Access level for the caller: `playable`, `preview`, or `blocked`.
         * Official search examples filter with `access=playable`.
         */
        readonly access: 'playable' | 'preview' | 'blocked' | string;
        /** URL to the track's artwork image (may be empty string if none) */
        readonly artwork_url: string;
        /** ISO country codes where the track is available, or null if unrestricted */
        readonly available_country_codes: string[] | null;
        /** Beats per minute of the track (0 if not set) */
        readonly bpm: number;
        /** Total number of comments on this track */
        readonly comment_count: number;
        /** Whether commenting is enabled on this track */
        readonly commentable: boolean;
        /** ISO 8601 timestamp of when the track was uploaded */
        readonly created_at: string;
        /** The track's description text */
        readonly description: string;
        /** Total number of downloads */
        readonly download_count: number;
        /** URL to download the original file (requires authentication) */
        readonly download_url: string;
        /** Whether the track is downloadable */
        readonly downloadable: boolean;
        /** Duration of the track in milliseconds */
        readonly duration: number;
        /** Who can embed this track (e.g. "all", "me", "none") */
        readonly embeddable_by: string;
        /** Total number of favorites/likes */
        readonly favoritings_count: number;
        /** Music genre of the track (e.g. "Electronic") */
        readonly genre: string;
        /** The track's unique numeric ID on SoundCloud */
        readonly id: number;
        /** International Standard Recording Code, or null if not set */
        readonly isrc: string | null;
        /** Musical key signature (e.g. "C major"), or null if not set */
        readonly key_signature: string | null;
        /** Resource type, always "track" */
        readonly kind: 'track';
        /** Record label name */
        readonly label_name: string;
        /** Creative Commons license type (e.g. "all-rights-reserved", "cc-by") */
        readonly license: string;
        /** Artist name when different from the uploader, or null */
        readonly metadata_artist: string | null;
        /** Monetization model applied to this track, or null */
        readonly monetization_model: string | null;
        /** Full URL to the track's SoundCloud page */
        readonly permalink_url: string;
        /** Total number of plays */
        readonly playback_count: number;
        /** Content policy applied to this track, or null */
        readonly policy: string | null;
        /** Label for the purchase/buy button */
        readonly purchase_title: string;
        /** External purchase URL */
        readonly purchase_url: string;
        /** Release identifier string, or null */
        readonly release: string | null;
        /** Day of the release date (1-31) */
        readonly release_day: number;
        /** Month of the release date (1-12) */
        readonly release_month: number;
        /** Year of the release date */
        readonly release_year: number;
        /** Total number of reposts */
        readonly reposts_count: number;
        /** Secret URI for private tracks, or null for public tracks */
        readonly secret_uri: string | null;
        /** Sharing setting: "public" or "private" */
        readonly sharing: string;
        /** URL to the audio stream (requires authentication) */
        readonly stream_url: string;
        /** Whether the track is streamable */
        readonly streamable: boolean;
        /** Space-separated list of tags (tags with spaces are wrapped in quotes) */
        readonly tag_list: string;
        /** The track's title */
        readonly title: string;
        /** API resource URI for this track */
        readonly uri: string;
        /** URN identifier (e.g. "soundcloud:tracks:123") */
        readonly urn: string;
        /** The user who uploaded this track */
        readonly user: User;
        /** Whether the authenticated user has liked this track */
        readonly user_favorite: boolean;
        /** Number of times the authenticated user has played this track, or null */
        readonly user_playback_count: number | null;
        /** URL to the track's waveform image data */
        readonly waveform_url: string;
    }

    /**
     * Represents a SoundCloud playlist (also known as a "set").
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/playlists/get_playlists__playlist_id_
     */
    interface Playlist {
        /** URL to the playlist's artwork image */
        readonly artwork_url: string;
        /** ISO 8601 timestamp of when the playlist was created */
        readonly created_at: string;
        /** The playlist's description text */
        readonly description: string;
        /** Whether tracks in the playlist are downloadable */
        readonly downloadable: boolean;
        /** Total duration of all tracks in the playlist in milliseconds */
        readonly duration: number;
        /** European Article Number (barcode) for the release */
        readonly ean: string;
        /** Who can embed this playlist (e.g. "all", "me", "none") */
        readonly embeddable_by: string;
        /** Music genre of the playlist */
        readonly genre: string;
        /** The playlist's unique numeric ID on SoundCloud */
        readonly id: number;
        /** Resource type, always "playlist" */
        readonly kind: 'playlist';
        /** Label user object, or null if no label is associated */
        readonly label: User | null;
        /** Numeric ID of the associated label, or null */
        readonly label_id: number | null;
        /** Name of the associated record label */
        readonly label_name: string;
        /** ISO 8601 timestamp of the last modification */
        readonly last_modified: string;
        /** Creative Commons license type */
        readonly license: string;
        /** Total number of likes on this playlist */
        readonly likes_count: number;
        /** URL-friendly slug for the playlist */
        readonly permalink: string;
        /** Full URL to the playlist's SoundCloud page */
        readonly permalink_url: string;
        /** Type of playlist (e.g. "album", "ep", "compilation") */
        readonly playlist_type: string;
        /** Label for the purchase/buy button */
        readonly purchase_title: string;
        /** External purchase URL */
        readonly purchase_url: string;
        /** Release identifier string */
        readonly release: string;
        /** Day of the release date (1-31) */
        readonly release_day: number;
        /** Month of the release date (1-12) */
        readonly release_month: number;
        /** Year of the release date */
        readonly release_year: number;
        /** Sharing setting: "public" or "private" */
        readonly sharing: string;
        /** Whether the playlist contains streamable tracks */
        readonly streamable: boolean;
        /** Space-separated list of tags */
        readonly tag_list: string;
        /** Comma-separated tags string, or null */
        readonly tags: string | null;
        /** The playlist's title */
        readonly title: string;
        /** Total number of tracks in the playlist */
        readonly track_count: number;
        /** Array of tracks in the playlist (may be empty if not fetched) */
        readonly tracks: Track[];
        /** API URI to fetch the playlist's tracks, or null */
        readonly tracks_uri: string | null;
        /** Playlist set type (e.g. "album", "playlist") */
        readonly type: string;
        /** API resource URI for this playlist */
        readonly uri: string;
        /** URN identifier (e.g. "soundcloud:playlists:123") */
        readonly urn: string;
        /** The user who created this playlist */
        readonly user: User;
        /** Numeric ID of the playlist creator */
        readonly user_id: number;
        /** URN of the playlist creator */
        readonly user_urn: string;
    }

    /**
     * Stream URLs for a SoundCloud track, containing various format options.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api#/tracks/get_tracks__track_id__streams
     */
    interface Streams {
        readonly hls_aac_160_url?: string;
        readonly hls_aac_96_url?: string;
        /** Preview MP3 stream URL at 128kbps for non-full-access tracks (may be undefined) */
        readonly preview_mp3_128_url?: string;
        /**
         * @deprecated https://developers.soundcloud.com/blog/api-streaming-urls
         */
        readonly http_mp3_128_url?: string;
        /**
         * @deprecated https://developers.soundcloud.com/blog/api-streaming-urls
         */
        readonly hls_mp3_128_url?: string;
        /**
         * @deprecated https://developers.soundcloud.com/blog/api-streaming-urls
         */
        readonly hls_opus_64_url?: string;
    }

    /**
     * Generic cursor-paginated response from the SoundCloud API.
     * Most list endpoints return this shape with `collection` and `next_href`.
     *
     * @see https://developers.soundcloud.com/docs/api/explorer/open-api
     */
    interface PaginatedResponse<T> {
        /** Array of items in this page */
        readonly collection: T[];
        /** URL to fetch the next page, or null/empty when there are no more pages */
        readonly next_href: string;
    }

    type MediaObject = Track | Playlist | User;
}
