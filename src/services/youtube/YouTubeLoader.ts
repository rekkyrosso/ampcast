import type {Observable} from 'rxjs';
import {merge, timer} from 'rxjs';
import {map, filter, take, skipWhile, takeUntil} from 'rxjs/operators';
import YouTubePlayer, {PlayerState} from './YouTubePlayer';

let loaderId = 0;

class YouTubeLoader extends YouTubePlayer {
    constructor() {
        super(`loader-${loaderId++}`);
        this.appendTo(document.body);
    }

    async loadPlaylist(src: string): Promise<string[]> {
        await this.cue(src);
        return this.player!.getPlaylist() || [];
    }

    async getDuration(src: string): Promise<number> {
        await this.cue(src);
        return this.player!.getDuration() || 0;
    }

    private cue(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const cued$ = this.observeCued();
            const error$ = merge(
                this.observeError(),
                timer(3000).pipe(map(() => Error('timeout')))
            );
            cued$.pipe(takeUntil(error$), take(1)).subscribe({next: resolve});
            error$.pipe(takeUntil(cued$), take(1)).subscribe({next: reject});
            this.load(src);
        });
    }

    private observeCued(): Observable<void> {
        return this.observeState().pipe(
            skipWhile((state) => state !== PlayerState.UNSTARTED),
            filter((state) => state === PlayerState.CUED),
            map(() => undefined),
            take(1)
        );
    }
}

export async function loadYouTubePlaylist(src: string): Promise<string[]> {
    const loader = new YouTubeLoader();
    try {
        const playlist = await loader.loadPlaylist(src);
        return playlist;
    } finally {
        loader.destroy();
    }
}

export async function getYouTubeVideoDuration(src: string): Promise<number> {
    const loader = new YouTubeLoader();
    try {
        const duration = await loader.getDuration(src);
        return duration;
    } finally {
        loader.destroy();
    }
}
