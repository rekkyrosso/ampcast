import React from 'react';
import theme from 'services/theme';
import themeStore from 'services/theme/themeStore';
import {DialogProps, showDialog} from 'components/Dialog';
import SaveThemeDialog from './SaveThemeDialog';

export default async function saveTheme(suggestedName: string): Promise<void> {
    const name = await showDialog(
        (props: DialogProps) => <SaveThemeDialog {...props} suggestedName={suggestedName} />,
        true
    );
    if (name) {
        theme.name = name;
        theme.userTheme = true;
        await themeStore.addUserTheme(theme.current);
    }
}
