import {useEffect} from 'react';
import {observePreferences} from 'services/preferences';

export default function useAppSettings(): void {
    useEffect(() => {
        const subscription = observePreferences().subscribe(
            ({disableExplicitContent, markExplicitContent}) => {
                const {classList} = document.body;
                classList.toggle('disable-explicit-content', disableExplicitContent);
                classList.toggle('mark-explicit-content', markExplicitContent);
            }
        );
        return () => subscription.unsubscribe();
    }, []);
}
