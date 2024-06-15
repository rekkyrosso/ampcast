import Theme from 'types/Theme';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import {error, prompt} from 'components/Dialog';
import confirmOverwriteTheme from './confirmOverwriteTheme';

export default async function importThemeFromFile(file: File): Promise<void> {
    try {
        const data = await file.text();
        const importedTheme: Theme = JSON.parse(data);
        if (!theme.validate(importedTheme)) {
            await error('Not a valid theme.');
            return;
        }
        let name = importedTheme.name;
        let confirmed = false;
        while (name && !confirmed) {
            name = await prompt({
                title: 'Import theme',
                suggestedValue: name,
                okLabel: 'Import',
                system: true,
            });
            if (name) {
                confirmed = await confirmOverwriteTheme(name);
                if (confirmed) {
                    await themeStore.save({...importedTheme, name});
                }
            }
        }
    } catch (err) {
        console.error(err);
        await error('Could not load theme.');
    }
}
