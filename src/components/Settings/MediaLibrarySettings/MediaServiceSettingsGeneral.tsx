import React, {useCallback, useId, useRef} from 'react';
import MediaService from 'types/MediaService';
import {getAuthService} from 'services/mediaServices';
import {isSourceVisible, setHiddenSources} from 'services/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useObservable from 'hooks/useObservable';
import './MediaServiceSettingsGeneral.scss';

export interface MediaServiceSettingsGeneralProps {
    service: MediaService;
}

export default function MediaServiceSettingsGeneral({service}: MediaServiceSettingsGeneralProps) {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);
    const authService = getAuthService(service);
    const connected = useObservable(authService.observeIsLoggedIn, false);

    const handleSubmit = useCallback(() => {
        const inputs = ref.current!.elements as HTMLInputElements;
        const settings: Record<string, boolean> = {};
        for (const input of inputs) {
            settings[input.value] = !input.checked;
        }
        setHiddenSources(settings);
    }, []);

    return (
        <form className="media-service-settings-general" method="dialog" onSubmit={handleSubmit}>
            <p>
                <button
                    type="button"
                    className="disconnect"
                    onClick={authService.logout}
                    disabled={!connected}
                >
                    {connected ? `Disconnect from ${authService.name}...` : 'Not connected'}
                </button>
            </p>
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul className="checkbox-list">
                    {service.sources.map((source) => (
                        <li key={source.id}>
                            <input
                                id={`${id}-${source.id}`}
                                type="checkbox"
                                value={source.id}
                                defaultChecked={isSourceVisible(source)}
                            />
                            <label htmlFor={`${id}-${source.id}`}>{source.title}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
