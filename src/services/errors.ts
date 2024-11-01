import {t} from './i18n';

export class FullScreenError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, FullScreenError.prototype);
    }
}

export class NoMusicLibraryError extends FullScreenError {
    readonly message = 'No music library found.';
}

export class NoMusicVideoLibraryError extends FullScreenError {
    readonly message = 'No music video library found.';
}

export class NoFavoritesPlaylistError extends FullScreenError {
    readonly message = t('No favorites playlist found.');
}

export class NoSpotifyChartsError extends FullScreenError {
    readonly message = 'Spotify Charts not found.';
}
