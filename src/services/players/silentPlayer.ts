import {Observable, of} from 'rxjs';
import {EMPTY} from 'rxjs';
import silenceMp3Base64 from 'assets/silence.mp3.base64';
import HTML5Player from './HTML5Player';

class SilentPlayer extends HTML5Player {
    constructor() {
        super('audio');
        this.element.loop = true;
        this.load(silenceMp3Base64)
    }

    set loop(loop: boolean) {
        // disable
    }

    observeCurrentTime(): Observable<number> {
        return of(0);
    }

    observeDuration(): Observable<number> {
        return of(0);
    }

    observeEnded(): Observable<void> {
        return EMPTY;
    }

    observeError(): Observable<unknown> {
        return EMPTY;
    }

    observePlaying(): Observable<void> {
        return EMPTY;
    }

    seek(): void {
        // do nothing
    }
}

export default new SilentPlayer();
