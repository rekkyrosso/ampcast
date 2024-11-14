import React, {useCallback} from 'react';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import useFactoryReset from 'hooks/useFactoryReset';

export default function Troubleshooting() {
    const factoryReset = useFactoryReset();

    const showFactoryReset = useCallback(async () => {
        const confirmed = await confirm({
            icon: 'settings',
            title: 'Factory Reset',
            message: (
                <p>
                    This will delete all of your current settings
                    <br />
                    and disconnect you from all services.
                </p>
            ),
            okLabel: 'Continue',
            system: true,
        });

        if (confirmed) {
            await factoryReset();
            location.reload();
        }
    }, [factoryReset]);

    return (
        <form className="troubleshooting" method="dialog">
            <fieldset>
                <legend>Options</legend>
                <p>
                    <button type="button" onClick={showFactoryReset}>
                        Factory Reset…
                    </button>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
