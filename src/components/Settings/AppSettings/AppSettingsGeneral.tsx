import React, {useCallback, useId, useRef} from 'react';
import {downloadUrl, supportUrl} from 'services/constants';
import electronSettings from 'services/electronSettings';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';
import {browser} from 'utils';

export default function AppSettingsGeneral() {
    const portRef = useRef<HTMLInputElement>(null);
    const id = useId();

    const handleSubmit = useCallback(async () => {
        if (browser.isElectron) {
            const port = portRef.current!.value;
            if (port !== location.port) {
                const confirmed = await confirm({
                    title: 'Change Port',
                    message: (
                        <p>
                            You will lose all of your current settings associated with this port
                            number
                            <br />
                            and the app will reload.
                        </p>
                    ),
                    okLabel: 'Continue',
                    system: true,
                });

                if (confirmed) {
                    electronSettings.port = port;
                    window.ampcastElectron?.setPort(Number(port));
                }
            }
        }
    }, []);

    return (
        <form className="app-settings-general" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>About</legend>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-version`}>Version:</label>
                        <output id={`${id}-version`}>{__app_version__}</output>
                    </p>
                </div>
            </fieldset>
            {browser.isElectron ? (
                <fieldset>
                    <legend>Server</legend>
                    <div className="table-layout">
                        <p>
                            <label htmlFor={`${id}-port`}>Port:</label>
                            <input
                                id={`${id}-port`}
                                type="number"
                                defaultValue={location.port}
                                min={80}
                                max={49151}
                                step={1}
                                ref={portRef}
                            />
                        </p>
                        <p>
                            <label htmlFor={`${id}-web`}>Web:</label>
                            <output id={`${id}-web`}>
                                <ExternalLink href={location.origin}>
                                    {location.origin}
                                </ExternalLink>
                            </output>
                        </p>
                    </div>
                </fieldset>
            ) : (
                <fieldset>
                    <legend>Download</legend>
                    <p className="service-link">
                        <ExternalLink href={downloadUrl}>{downloadUrl.slice(8)}</ExternalLink>
                    </p>
                </fieldset>
            )}
            <fieldset>
                <legend>Support</legend>
                <p className="service-link">
                    <ExternalLink href={supportUrl}>{supportUrl.slice(8)}</ExternalLink>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
