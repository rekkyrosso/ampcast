import {useEffect, useState} from 'react';
import {take} from 'rxjs';
import LookupStatus from 'types/LookupStatus';
import {observePlaying} from 'services/mediaPlayback';
import {hasPlayableSrc} from 'services/mediaServices';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';

export type InterstitialState = 'searching' | 'loading' | 'ready';

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
                setState('ready');
                break;

            default:
                if (item) {
                    if (hasPlayableSrc(item)) {
                        setState('loading');
                        const subscription = observePlaying()
                            .pipe(take(1))
                            .subscribe(() => setState('ready'));
                        return () => subscription.unsubscribe();
                    } else {
                        setState('searching');
                    }
                } else {
                    setState('ready');
                }
        }
    }, [item]);

    return state;
}
