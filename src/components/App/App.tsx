import React, {useCallback, useState} from 'react';
import {browser, LiteStorage} from 'utils';
import SvgDefs from 'components/Icon/SvgDefs';
import AppContent from './AppContent';
import DesktopWarning from './DesktopWarning';

const settings = new LiteStorage('desktopWarning');

export default function App() {
    const [desktopWarningHidden, setDesktopWarningHidden] = useState(
        () => browser.desktop || settings.getBoolean('dismissed')
    );

    const dismissWarning = useCallback(() => {
        settings.setBoolean('dismissed', true);
        setDesktopWarningHidden(true);
    }, []);

    return (
        <>
            <SvgDefs />
            <main>
                {desktopWarningHidden ? (
                    <AppContent />
                ) : (
                    <DesktopWarning onDismiss={dismissWarning} />
                )}
            </main>
        </>
    );
}
