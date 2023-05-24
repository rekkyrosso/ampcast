import {useMemo} from 'react';
import {map, merge} from 'rxjs';
import theme, {CurrentTheme} from 'services/theme';
import themeStore from 'services/theme/themeStore';
import useObservable from 'hooks/useObservable';

export default function useCurrentTheme(): CurrentTheme {
    const observeTheme = useMemo(
        () => () => {
            // Make sure we get a fresh object.
            return merge(theme.observe(), themeStore.observeUserThemes()).pipe(
                map(() => ({...theme.current}))
            );
        },
        []
    );
    return useObservable(observeTheme, theme.current);
}
