import React, {useCallback, useId, useRef} from 'react';
import electronSettings from 'services/electronSettings';
import AppTitle from './AppTitle';
import './PortUnavailable.scss';

export interface PortUnavailableProps {
    onDismiss: () => void;
}

export default function PortUnavailable({onDismiss}: PortUnavailableProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const port = electronSettings.port;

    const handleSubmit = useCallback(() => {
        const ampcastElectron = window.ampcastElectron;
        const decision = ampcastElectron ? ref.current![id]?.value : 'continue';

        switch (decision) {
            case 'switch':
                electronSettings.port = location.port;
                ampcastElectron.setPort(Number(location.port));
                break;

            case 'quit':
                ampcastElectron.quit();
                break;

            default:
                onDismiss();
        }
    }, [onDismiss, id]);

    return (
        <form className="port-unavailable" onSubmit={handleSubmit} ref={ref}>
            <AppTitle />
            <h2>
                <span className="error">Port unavailable:</span> {port}
            </h2>
            <p>
                The port this application uses is currently unavailable. <br />
                This is possibly due to it being used by another application.
            </p>
            <p>
                You are currently using a temporary port: <strong>{location.port}</strong>
            </p>
            <p>
                Switching ports would mean losing access to your current settings/history. <br />
                This change is revertible however.
            </p>
            <p>How would you like to proceed?</p>
            <ul>
                <li>
                    <input
                        type="radio"
                        name={id}
                        id={`${id}-continue`}
                        value="continue"
                        defaultChecked
                    />
                    <label htmlFor={`${id}-continue`}>
                        Continue using the temporary port (but remember the old port)
                    </label>
                </li>
                <li>
                    <input type="radio" name={id} id={`${id}-switch`} value="switch" />
                    <label htmlFor={`${id}-switch`}>Switch to the new port</label>
                </li>
                <li>
                    <input type="radio" name={id} id={`${id}-quit`} value="quit" />
                    <label htmlFor={`${id}-quit`}>Quit the application</label>
                </li>
            </ul>
            <p>
                <button type="submit">Proceed</button>
            </p>
        </form>
    );
}
