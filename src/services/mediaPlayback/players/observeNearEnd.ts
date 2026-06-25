import type {Observable} from 'rxjs';
import {combineLatest, distinctUntilChanged, map} from 'rxjs';
import Player from 'types/Player';

export default function observeNearEnd<T>(
    player: Player<T>,
    secondsBeforeEnd: number
): Observable<boolean> {
    return combineLatest([player.observeDuration(), player.observeCurrentTime()]).pipe(
        map(
            ([duration, currentTime]) => duration > 0 && duration - currentTime <= secondsBeforeEnd
        ),
        distinctUntilChanged()
    );
}
