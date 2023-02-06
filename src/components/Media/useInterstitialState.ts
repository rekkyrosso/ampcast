import {useEffect, useState} from 'react';
import {take} from 'rxjs';
import LookupStatus from 'types/LookupStatus';
import {observePlaying} from 'services/mediaPlayback';
import {hasPlayableSrc} from 'services/mediaServices';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';

export type InterstitialState = 'searching' | 'loading' | 'loaded';

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
                setState('loaded');
                break;

            default:
                if (item) {
                    if (hasPlayableSrc(item)) {
                        setState('loading');
                        const subscription = observePlaying()
                            .pipe(take(1))
                            .subscribe(() => setState('loaded'));
                        return () => subscription.unsubscribe();
                    } else {
                        setState('searching');
                    }
                } else {
                    setState('loaded');
                }
        }
    }, [item]);

    return state;
}
