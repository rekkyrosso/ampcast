import themeStore from 'services/theme/themeStore';
import {confirm} from 'components/Dialog';

export default async function confirmOverwriteTheme(name: string): Promise<boolean> {
    if (!themeStore.getUserTheme(name)) {
        return true;
    }
    return confirm({
        icon: 'palette',
        title: 'My Themes',
        message: `Overwrite existing theme '${name}'?`,
        okLabel: 'Overwrite',
        system: true,
    });
}
