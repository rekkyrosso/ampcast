import {useEffect, useState} from 'react';
import {distinctUntilChanged, map, Subscription} from 'rxjs';
import LookupStatus from 'types/LookupStatus';
import {observeError, observePlaying} from 'services/mediaPlayback';
import {isPlayableSrc} from 'services/mediaServices';
import {observeCurrentItem} from 'services/playlist';

export type LoadingState = 'searching' | 'loading' | 'loaded' | 'error';

export default function useLoadingState(): LoadingState {
    const [state, setState] = useState<LoadingState>('searching');

    useEffect(() => {
        const subscription = new Subscription();
        subscription.add(observePlaying().subscribe(() => setState('loaded')));
        subscription.add(observeError().subscribe(() => setState('error')));
        subscription.add(
            observeCurrentItem()
                .pipe(
                    map((item) => item?.src),
                    distinctUntilChanged()
                )
                .subscribe((src) => {
                    if (src) {
                        if (isPlayableSrc(src)) {
                            setState('loading');
                        } else {
                            setState('searching');
                        }
                    } else {
                        setState('loaded');
                    }
                })
        );
        subscription.add(
            observeCurrentItem()
                .pipe(
                    map((item) => item?.lookupStatus),
                    distinctUntilChanged()
                )
                .subscribe((lookupStatus) => {
                    switch (lookupStatus) {
                        case LookupStatus.Looking:
                            setState('searching');
                            break;

                        case LookupStatus.NotFound:
                            setState('error');
                            break;
                    }
                })
        );
        return () => subscription.unsubscribe();
    }, []);

    return state;
}
