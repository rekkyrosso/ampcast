import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import ampcastElectron from 'services/ampcastElectron';
import AppTitle from './AppTitle';
import './PortUnavailable.scss';

export interface PortUnavailableProps {
    onDismiss: () => void;
}

export default function PortUnavailable({onDismiss}: PortUnavailableProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const [preferredPort, setPreferredPort] = useState(0);

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        
        const decision = ampcastElectron ? ref.current![id]?.value : 'dismiss';

        switch (decision) {
            case 'switch':
                await ampcastElectron!.setPreferredPort(Number(location.port));
                break;

            case 'quit':
                ampcastElectron!.quit();
                break;

            default:
                onDismiss();
        }
    }, [onDismiss, id]);

    useEffect(() => {
        ampcastElectron?.getPreferredPort().then(setPreferredPort)
    }, []);

    useEffect(() => {
        if (location.port === String(preferredPort)) {
            onDismiss();
        }
    }, [preferredPort, onDismiss]);

    if (!preferredPort || location.port === String(preferredPort)) {
        return null;
    }

    return (
        <form className="port-unavailable" onSubmit={handleSubmit} ref={ref}>
            <AppTitle />
            <h2>
                <span className="error">Port unavailable:</span> {preferredPort}
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
