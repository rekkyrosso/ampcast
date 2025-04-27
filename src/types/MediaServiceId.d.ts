export type PublicMediaServiceId =
    | 'apple'
    | 'internet-radio'
    | 'mixcloud'
    | 'soundcloud'
    | 'spotify'
    | 'tidal'
    | 'youtube';

export type PersonalMediaServiceId =
    | 'airsonic'
    | 'ampache'
    | 'emby'
    | 'gonic'
    | 'jellyfin'
    | 'navidrome'
    | 'plex'
    | 'subsonic';

export type DataServiceId = 'lastfm' | 'listenbrainz';

type MediaServiceId = PublicMediaServiceId | PersonalMediaServiceId | DataServiceId;

export default MediaServiceId;
