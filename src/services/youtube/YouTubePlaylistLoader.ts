import type {Observable} from 'rxjs';
import {EMPTY, lastValueFrom} from 'rxjs';
import {map, filter, take, skipWhile} from 'rxjs/operators';
import YouTubePlayer, {PlayerState} from './YouTubePlayer';

export class YouTubePlaylistLoader extends YouTubePlayer {
    constructor() {
        super('loader');
        this.appendTo(document.body);
    }

    protected observeVideoSize(): Observable<never> {
        return EMPTY;
    }

    async loadPlaylist(src: string): Promise<string[]> {
        this.load(src);
        return lastValueFrom(
            this.observeState().pipe(
                skipWhile((state) => state !== PlayerState.UNSTARTED),
                filter((state) => state === PlayerState.CUED),
                map(() => this.getPlaylist()),
                take(1)
            )
        );
    }
}

export async function loadPlaylist(src: string): Promise<string[]> {
    const playlistLoader = new YouTubePlaylistLoader();
    const playlist = await playlistLoader.loadPlaylist(src);
    playlistLoader.destroy();
    return playlist;
}
