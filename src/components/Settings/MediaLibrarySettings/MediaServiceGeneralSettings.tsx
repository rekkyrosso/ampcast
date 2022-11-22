import React, {useCallback, useId, useRef} from 'react';
import {isVisible, setHidden} from 'services/servicesSettings';
import Input from 'components/Input';
import Button from 'components/Button';
import useObservable from 'hooks/useObservable';
import {MediaServiceSettingsProps} from './MediaServiceSettings';

export default function MediaServiceGeneralSettings({service}: MediaServiceSettingsProps) {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);
    const connected = useObservable(service.observeIsLoggedIn, false);

    const handleSubmit = useCallback(() => {
        const inputs = ref.current!.elements as HTMLInputElements;
        const settings: Record<string, boolean> = {};
        for (const input of inputs) {
            settings[input.value] = !input.checked;
        }
        setHidden(settings);
    }, []);

    return (
        <form
            className={`media-library-settings ${service.id}-settings general-settings`}
            method="dialog"
            onSubmit={handleSubmit}
        >
            <p>
                <Button className="disconnect" onClick={service.logout} disabled={!connected}>
                    {connected ? 'Disconnect...' : 'Not connected'}
                </Button>
            </p>
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul>
                    {service.sources.map((source) => (
                        <li key={source.id}>
                            <Input
                                id={`${id}-${source.id}`}
                                type="checkbox"
                                value={source.id}
                                defaultChecked={isVisible(source)}
                            />
                            <label htmlFor={`${id}-${source.id}`}>{source.title}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
