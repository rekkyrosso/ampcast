import type {Observable} from 'rxjs';
import {EMPTY, filter, map, merge, take, takeUntil, timer} from 'rxjs';
import YouTubePlayer, {PlayerState} from './YouTubePlayer';

let loaderId = 0;

class YouTubeLoader extends YouTubePlayer {
    constructor(src: string) {
        super(`loader-${loaderId++}`);
        this.load(src);
    }

    async loadPlaylist(): Promise<string[]> {
        await this.cue();
        return this.player!.getPlaylist() || [];
    }

    protected observeVideoSize(): Observable<never> {
        return EMPTY;
    }

    async loadDuration(): Promise<number> {
        await this.cue();
        return this.player!.getDuration() || 0;
    }

    private cue(): Promise<void> {
        return new Promise((resolve, reject) => {
            const cued$ = this.observeCued();
            const error$ = merge(
                this.observeError(),
                timer(3000).pipe(map(() => Error('timeout')))
            );
            cued$.pipe(takeUntil(error$), take(1)).subscribe({next: resolve});
            error$.pipe(takeUntil(cued$), take(1)).subscribe({next: reject});
            setTimeout(() => this.appendTo(document.body));
        });
    }

    private observeCued(): Observable<void> {
        return this.observeState().pipe(
            filter((state) => state === PlayerState.CUED),
            map(() => undefined),
            take(1)
        );
    }
}

export async function loadYouTubePlaylist(src: string): Promise<string[]> {
    const loader = new YouTubeLoader(src);
    try {
        const playlist = await loader.loadPlaylist();
        return playlist;
    } finally {
        loader.destroy();
    }
}

export async function getYouTubeVideoDuration(src: string): Promise<number> {
    const loader = new YouTubeLoader(src);
    try {
        const duration = await loader.loadDuration();
        return duration;
    } finally {
        loader.destroy();
    }
}
