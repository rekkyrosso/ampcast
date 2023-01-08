import React, {useCallback, useState} from 'react';
import {browser, LiteStorage} from 'utils';
import './DesktopWarning.scss';

const settings = new LiteStorage('desktopWarning');

export default function DesktopWarning() {
    const [hidden, setHidden] = useState(() => browser.desktop || settings.getBoolean('dismissed'));

    const hide = useCallback(() => {
        settings.setBoolean('dismissed', true);
        setHidden(true);
    }, []);

    return hidden ? null : (
        <div className="desktop-warning">
            <h1>
                {__app_name__} {__app_version__}
            </h1>
            <p>This application is intended for a desktop browser.</p>
            <p>
                <button onClick={hide}>Proceed</button>
            </p>
        </div>
    );
}
