import React, {useCallback} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import showFactoryReset from './showFactoryReset';
import ErrorReportButton from 'components/ErrorScreen/ErrorReportButton';
import {createSnapshot} from 'services/reporting';

export default function Troubleshooting() {
    const factoryReset = useCallback((event: React.FormEvent) => {
        event.preventDefault();
        showFactoryReset();
    }, []);

    const handleSnapshotClick = useCallback(async () => {
        const snapshot = createSnapshot();
        await navigator.clipboard.writeText(JSON.stringify({snapshot}, undefined, 2));
    }, []);

    return (
        <form className="troubleshooting" method="dialog">
            <fieldset>
                <legend>Options</legend>
                <p>
                    <button onClick={factoryReset}>Factory Reset…</button>
                </p>
            </fieldset>
            <fieldset>
                <legend>App state</legend>
                <p>
                    <ErrorReportButton
                        title="Copy a snapshot at the current time"
                        onClick={handleSnapshotClick}
                    >
                        Copy snapshot
                    </ErrorReportButton>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
