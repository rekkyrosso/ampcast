import themeStore from 'services/theme/themeStore';
import {confirm} from 'components/Dialog';

export default async function confirmOverwriteTheme(name: string): Promise<boolean> {
    if (!themeStore.getUserTheme(name)) {
        return true;
    }
    return confirm({
        title: 'My themes',
        message: `Overwrite existing theme '${name}'?`,
        buttonLabel: 'Save',
        storageId: 'overwrite-user-theme',
        system: true,
    });
}
