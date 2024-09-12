import React, {useCallback, useState} from 'react';
import {browser, LiteStorage} from 'utils';
import SvgDefs from 'components/Icon/SvgDefs';
import AppContent from './AppContent';
import DesktopWarning from './DesktopWarning';
import PortUnavailable from './PortUnavailable';

const settings = new LiteStorage('desktopWarning');

export default function App() {
    const [desktopWarningDismissed, setDesktopWarningDismissed] = useState(
        () => browser.desktop || settings.getBoolean('dismissed')
    );
    const [portUnavailableDismissed, setPortUnavailableDismissed] = useState(
        () => !browser.isElectron
    );

    const dismissDesktopWarning = useCallback(() => {
        settings.setBoolean('dismissed', true);
        setDesktopWarningDismissed(true);
    }, []);

    const dismissPortUnavailable = useCallback(() => {
        setPortUnavailableDismissed(true);
    }, []);

    return (
        <>
            <SvgDefs />
            <main>
                {desktopWarningDismissed ? (
                    portUnavailableDismissed ? (
                        <AppContent />
                    ) : (
                        <PortUnavailable onDismiss={dismissPortUnavailable} />
                    )
                ) : (
                    <DesktopWarning onDismiss={dismissDesktopWarning} />
                )}
            </main>
        </>
    );
}
