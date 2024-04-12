import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {getMusicKitInstance} from '../appleAuth';

export default function useMusicKit(devToken: string) {
    const [musicKit, setMusicKit] = useState<MusicKit.MusicKitInstance | null>(null);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (devToken) {
            const subscription = from(getMusicKitInstance()).subscribe({
                next: setMusicKit,
                error: setError,
            });
            return () => subscription.unsubscribe();
        }
    }, [devToken]);

    return {musicKit, error};
}
