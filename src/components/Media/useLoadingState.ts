import {useEffect, useState} from 'react';
import {Subscription, filter, race, take} from 'rxjs';
import LookupStatus from 'types/LookupStatus';
import {observeCurrentTime, observeError, observePlaying} from 'services/mediaPlayback';
import {isPlayableSrc} from 'services/mediaServices';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';

export type LoadingState = 'searching' | 'loading' | 'loaded' | 'error';

export default function useLoadingState(): LoadingState {
    const [state, setState] = useState<LoadingState>('searching');
    const item = useCurrentlyPlaying();
    const id = item?.id;
    const src = item?.src;
    const lookupStatus = item?.lookupStatus;

    useEffect(() => setState('searching'), [id]);

    useEffect(() => {
        switch (lookupStatus) {
            case LookupStatus.Looking:
                setState('searching');
                break;

            case LookupStatus.NotFound:
                setState('error');
                break;

            default:
                if (src) {
                    if (isPlayableSrc(src)) {
                        setState('loading');
                        const subscription = new Subscription();
                        subscription.add(
                            race(
                                observePlaying(),
                                observeCurrentTime().pipe(filter((time) => time >= 1))
                            )
                                .pipe(take(1))
                                .subscribe(() => setState('loaded'))
                        );
                        subscription.add(
                            observeError()
                                .pipe(take(1))
                                .subscribe(() => setState('error'))
                        );
                        return () => subscription.unsubscribe();
                    } else {
                        setState('searching');
                    }
                } else {
                    setState('loaded');
                }
        }
    }, [id, src, lookupStatus]);

    return state;
}
