import React, {useCallback} from 'react';
import Button from 'components/Button';
import {DialogButtons, confirm} from 'components/Dialog';
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
                    <Button type="button" onClick={showFactoryReset}>
                        Factory Reset…
                    </Button>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
