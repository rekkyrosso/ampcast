import {useMemo} from 'react';
import themeStore from 'services/theme/themeStore';
import useObservable from 'hooks/useObservable';

export default function useUserThemes() {
    const observeUserThemes = useMemo(() => () => themeStore.observeUserThemes(), []);
    return useObservable(observeUserThemes, themeStore.getUserThemes());
}
