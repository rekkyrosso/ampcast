import React, {useCallback} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import showFactoryReset from './showFactoryReset';

export default function AdvancedSettingsGeneral() {
    const factoryReset = useCallback((event: React.FormEvent) => {
        event.preventDefault();
        showFactoryReset();
    }, []);

    return (
        <form className="advanced-settings-general" method="dialog">
            <p>
                <button onClick={factoryReset}>Factory Reset…</button>
            </p>
            <DialogButtons />
        </form>
    );
}
