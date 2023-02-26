import {useMemo} from 'react';
import themeStore from 'services/theme/themeStore';

export default function useDefaultThemes() {
    return useMemo(() => themeStore.getDefaultThemes(), []);
}
