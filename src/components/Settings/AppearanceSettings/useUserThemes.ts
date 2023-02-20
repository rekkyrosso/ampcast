import {useEffect, useState} from 'react';
import Theme from 'types/Theme';
import themeStore from 'services/theme/themeStore';

export default function useUserThemes() {
    const [themes, setThemes] = useState<readonly Theme[]>([]);

    useEffect(() => {
        (async () => {
            const themes = await themeStore.getUserThemes();
            setThemes(themes);
        })();
    }, []);

    return themes;
}
