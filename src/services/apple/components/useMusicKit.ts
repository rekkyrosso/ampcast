import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {getMusicKitInstance} from '../appleAuth';

export default function useMusicKit() {
    const [musicKit, setMusicKit] = useState<MusicKit.MusicKitInstance | null>(null);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const subscription = from(getMusicKitInstance()).subscribe({
            next: setMusicKit,
            error: setError,
        });
        return () => subscription.unsubscribe();
    }, []);

    return {musicKit, error};
}
