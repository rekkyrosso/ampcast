import React, {useCallback, useId, useRef} from 'react';
import type {FallbackProps} from 'react-error-boundary';
import './BSOD.scss';

export default function BSOD({error}: FallbackProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        switch (ref.current?.['bsod-decision'].value) {
            case 'clear-playlist':
                indexedDB.deleteDatabase('ampcast/playlist');
                break;

            case 'factory-reset':
                localStorage.clear();
                sessionStorage.clear();
                try {
                    const databases = await indexedDB.databases();
                    await Promise.all(
                        databases
                            .map((db) => db.name)
                            .filter((name) => name != null)
                            .map((name) => indexedDB.deleteDatabase(name))
                    );
                } catch (err) {
                    console.error(err);
                }
                break;
        }
        location.reload();
    }, []);

    return (
        <div className="bsod">
            <form onSubmit={handleSubmit} ref={ref}>
                <h2>ampcast fatal error</h2>
                <pre className="note error">{error?.message || String(error)}</pre>
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
                                id={`${id}-factory-reset`}
                                value="factory-reset"
                            />
                            <label htmlFor={`${id}-factory-reset`}>Factory reset</label>
                        </li>
                    </ul>
                </fieldset>
                <footer className="bsod-buttons">
                    <button>Reload</button>
                </footer>
            </form>
        </div>
    );
}
