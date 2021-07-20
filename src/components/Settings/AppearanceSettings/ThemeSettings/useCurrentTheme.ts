import Theme from 'types/Theme';
import theme from 'services/theme';
import none from 'services/theme/themes/none';
import useObservable from 'hooks/useObservable';

export default function useCurrentTheme(): Theme {
    return useObservable(() => theme.observe(), none);
}
