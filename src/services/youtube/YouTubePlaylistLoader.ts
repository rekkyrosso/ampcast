import type {Observable} from 'rxjs';
import {EMPTY, lastValueFrom} from 'rxjs';
import {map, filter, take, skipWhile} from 'rxjs/operators';
import YouTubePlayer, {PlayerState} from './YouTubePlayer';

// NOT CURRENTLY USED.

export class YouTubePlaylistLoader extends YouTubePlayer {
    constructor() {
        super('loader');
        this.appendTo(document.body);
    }

    protected observeVideoSize(): Observable<never> {
        return EMPTY;
    }

    async loadPlaylist(playlistId: string): Promise<string[]> {
        this.load(`youtube:playlist:${playlistId}`);

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

export async function loadPlaylist(url: string): Promise<string[]> {
    if (/youtu\.?be/.test(url)) {
        const params = new URLSearchParams(new URL(url).search);
        const playlistId = params.get('list') || '';
        const playlistLoader = new YouTubePlaylistLoader();
        const playlist = await playlistLoader.loadPlaylist(playlistId);
        playlistLoader.destroy();
        return playlist;
    }
    return [];
}
