import type {Observable} from 'rxjs';
import {distinctUntilChanged, map, withLatestFrom} from 'rxjs';
import Player from 'types/Player';

export default function observeNearEnd<T>(
    player: Player<T>,
    secondsBeforeEnd: number
): Observable<boolean> {
    return player.observeCurrentTime().pipe(
        withLatestFrom(player.observeDuration()),
        map(([currentTime, duration]) => duration - currentTime <= secondsBeforeEnd),
        distinctUntilChanged()
    );
}
