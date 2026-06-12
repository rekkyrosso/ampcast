import Theme from 'types/Theme';
import {LiteStorage} from 'utils';

export type ColorScheme = 'dark' | 'light' | 'user';

const recentThemes = new LiteStorage('recentThemes');

export default function useRecentThemes() {
    return {getRecentTheme, setRecentTheme};
}

function getRecentTheme(scheme: ColorScheme, themes: readonly Theme[]): string | undefined {
    const themeName = recentThemes.getString(scheme);
    if (themeName && themes.find((theme) => theme.name === themeName)) {
        return themeName;
    }
}

function setRecentTheme(scheme: ColorScheme, themeName: string): void {
    if (themeName) {
        recentThemes.setString(scheme, themeName);
    } else {
        recentThemes.removeItem(scheme);
    }
}
