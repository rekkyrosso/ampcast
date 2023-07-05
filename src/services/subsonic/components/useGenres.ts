import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import subsonicApi from '../subsonicApi';

export default function useGenres() {
    const [genres, setGenres] = useState<Subsonic.Genre[]>([]);

    useEffect(() => {
        const subscription = from(subsonicApi.getGenres()).subscribe(setGenres);
        return () => subscription.unsubscribe();
    }, []);

    return genres;
}
