import {useMemo} from 'react';
import Theme from 'types/Theme';
import theme from 'services/theme';
import defaultTheme from 'services/theme/themes/default.json';
import useObservable from 'hooks/useObservable';

export default function useCurrentTheme(): Theme {
    const observeTheme = useMemo(() => () => theme.observe(), []);
    return useObservable(observeTheme, defaultTheme);
}
