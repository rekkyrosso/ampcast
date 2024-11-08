import {t} from './i18n';

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

const statusCodes: Record<number, string> = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    408: 'Timeout',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Timeout',
};

export function getReadableErrorMessage(error: any): string {
    return (
        (error
            ? typeof error === 'string'
                ? error
                : error.isMKError
                ? error.name
                : String(
                      error.message ||
                          error.statusText ||
                          statusCodes[error.status] ||
                          error.status ||
                          ''
                  )
            : '') || 'unknown'
    );
}
