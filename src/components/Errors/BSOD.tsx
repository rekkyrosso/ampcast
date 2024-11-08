import React, {useCallback, useId, useRef} from 'react';
import type {FallbackProps} from 'react-error-boundary';
import ampcastElectron from 'services/ampcastElectron';
import {getServices} from 'services/mediaServices';
import useFactoryReset from 'hooks/useFactoryReset';
import ErrorReport from './ErrorReport';
import './BSOD.scss';

export default function BSOD({error}: FallbackProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const factoryReset = useFactoryReset();

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            switch (ref.current?.['bsod-decision'].value) {
                case 'clear-playlist':
                    indexedDB.deleteDatabase('ampcast/playlist');
                    break;

                case 'logout':
                    try {
                        await Promise.all(getServices().map((service) => service.logout()));
                    } catch (err) {
                        console.error(err);
                    }
                    break;

                case 'factory-reset':
                    await factoryReset();
                    break;
            }
            location.reload();
        },
        [factoryReset]
    );

    return (
        <div className="bsod">
            <form onSubmit={handleSubmit} ref={ref}>
                <h2>ampcast fatal error</h2>
                <ErrorReport error={error} reportedBy="BSOD" />
                <fieldset>
                    <legend>Recovery</legend>
                    <ul>
                        <li>
                            <input
                                type="radio"
                                name="bsod-decision"
                                id={`${id}-reload`}
                                value="reload"
                                defaultChecked
                            />
                            <label htmlFor={`${id}-reload`}>Just reload</label>
                        </li>
                        <li>
                            <input
                                type="radio"
                                name="bsod-decision"
                                id={`${id}-clear-playlist`}
                                value="clear-playlist"
                            />
                            <label htmlFor={`${id}-clear-playlist`}>Clear playlist</label>
                        </li>
                        <li>
                            <input
                                type="radio"
                                name="bsod-decision"
                                id={`${id}-logout`}
                                value="logout"
                            />
                            <label htmlFor={`${id}-logout`}>Logout of all services</label>
                        </li>
                        <li>
                            <input
                                type="radio"
                                name="bsod-decision"
                                id={`${id}-factory-reset`}
                                value="factory-reset"
                            />
                            <label htmlFor={`${id}-factory-reset`}>Factory reset</label>
                        </li>
                    </ul>
                </fieldset>
                <footer className="bsod-buttons">
                    <button>Reload</button>
                    {ampcastElectron ? (
                        <button type="button" onClick={() => ampcastElectron!.quit()}>
                            Exit
                        </button>
                    ) : null}
                </footer>
            </form>
        </div>
    );
}
