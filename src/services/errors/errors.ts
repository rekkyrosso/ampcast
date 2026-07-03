import {t} from 'services/i18n';

export abstract class MediaSourceError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NoInternetError extends MediaSourceError {
    readonly message = 'Internet connection required';
}

export class NoMusicLibraryError extends MediaSourceError {
    readonly message = 'No music library';
}

export class NoMusicVideoLibraryError extends MediaSourceError {
    readonly message = 'No music video library';
}

export class NoFavoritesPlaylistError extends MediaSourceError {
    readonly message = t('Favorites playlist not found');
}

export class NoSpotifyChartsError extends MediaSourceError {
    readonly message = 'Spotify charts not found';
}

export class LyricsNotAvailableError extends MediaSourceError {
    readonly message = 'Lyrics not available';
}

export class OpenSubsonicRequiredError extends MediaSourceError {
    readonly message = 'OpenSubsonic server required';
}
