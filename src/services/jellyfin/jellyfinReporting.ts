import {EMPTY} from 'rxjs';
import {distinctUntilChanged, filter, skip, switchMap, takeUntil} from 'rxjs/operators';
import PlaybackState from 'types/PlaybackState';
import {
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observePlaybackState,
} from 'services/mediaPlayback';
import {reportStart, reportStop, reportProgress} from './jellyfinPlayback';

console.log('module::jellyfinReporting');

const isJellyfinItem = (state: PlaybackState): boolean =>
    state.currentItem?.src.startsWith('jellyfin:') || false;

const jellyfinFilter = filter(isJellyfinItem);

observePlaybackStart()
    .pipe(jellyfinFilter)
    .subscribe(({currentItem}) => reportStart(currentItem!));

observePlaybackEnd()
    .pipe(jellyfinFilter)
    .subscribe(({currentItem, currentTime}) => reportStop(currentItem!, currentTime));

observePlaybackProgress(10_000)
    .pipe(jellyfinFilter)
    .subscribe(({currentItem, currentTime, paused}) =>
        reportProgress(currentItem!, currentTime, paused, 'timeupdate')
    );

observePlaybackStart()
    .pipe(
        switchMap((state) =>
            isJellyfinItem(state)
                ? observePlaybackState().pipe(
                      distinctUntilChanged((a, b) => a.paused === b.paused),
                      skip(1),
                      takeUntil(observePlaybackEnd())
                  )
                : EMPTY
        )
    )
    .subscribe(({currentItem, currentTime, paused}) =>
        reportProgress(currentItem!, currentTime, paused, paused ? 'pause' : 'unpause')
    );
