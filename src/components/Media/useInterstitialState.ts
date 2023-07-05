import {useEffect, useState} from 'react';
import {Subscription, take} from 'rxjs';
import LookupStatus from 'types/LookupStatus';
import {observeError, observePlaying} from 'services/mediaPlayback';
import {hasPlayableSrc} from 'services/mediaServices';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';

export type InterstitialState = 'searching' | 'loading' | 'playing' | 'error';

export default function useInterstitialState() {
    const [state, setState] = useState<InterstitialState>('searching');
    const item = useCurrentlyPlaying();
    const playlistItemId = item?.id;

    useEffect(() => setState('searching'), [playlistItemId]);

    useEffect(() => {
        switch (item?.lookupStatus) {
            case LookupStatus.Looking:
                setState('searching');
                break;

            case LookupStatus.NotFound:
                setState('error');
                break;

            default:
                if (item) {
                    if (hasPlayableSrc(item)) {
                        setState('loading');
                        const subscription = new Subscription();
                        subscription.add(
                            observePlaying()
                                .pipe(take(1))
                                .subscribe(() => setState('playing'))
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
                    setState('playing');
                }
        }
    }, [item]);

    return state;
}
