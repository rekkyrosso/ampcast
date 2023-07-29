export class FullScreenError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, FullScreenError.prototype);
    }
}

export class NoMusicLibrary extends FullScreenError {
    readonly message = 'No music library found.';
}

export class NoMusicVideoLibrary extends FullScreenError {
    readonly message ='No music video library found.';
}

export class NoTidalSubscription extends FullScreenError {
    readonly message = 'No TIDAL subscription found.';
}
