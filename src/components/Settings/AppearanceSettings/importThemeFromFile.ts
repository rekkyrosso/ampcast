import Theme from 'types/Theme';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import {alert, prompt} from 'components/Dialog';
import confirmOverwriteTheme from './confirmOverwriteTheme';

export default async function importThemeFromFile(file: File): Promise<void> {
    const title = 'Import theme';
    const system = true;
    try {
        const data = await file.text();
        const importedTheme: Theme = JSON.parse(data);
        if (!theme.validate(importedTheme)) {
            await alert({
                title,
                message: 'Not a valid theme.',
                system,
            });
            return;
        }
        let name = importedTheme.name;
        let confirmed = false;
        while (name && !confirmed) {
            name = await prompt({
                title,
                suggestedValue: name,
                okLabel: 'Import',
                system,
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
        await alert({
            title,
            message: 'Could not load theme.',
            system,
        });
    }
}
