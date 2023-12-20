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
    readonly message ='No music video library found.';
}

export class NoTidalSubscriptionError extends FullScreenError {
    readonly message = 'No TIDAL subscription found.';
}

export class NoFavoritesPlaylistError extends FullScreenError {
    readonly message = 'No favorites playlist found.';
}
