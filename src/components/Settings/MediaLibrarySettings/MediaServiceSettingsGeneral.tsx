import React, {useCallback, useId, useRef} from 'react';
import MediaService from 'types/MediaService';
import {isSourceVisible, setHiddenSources} from 'services/mediaServices/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import DisconnectButton from './DisconnectButton';
import './MediaServiceSettingsGeneral.scss';

export interface MediaServiceSettingsGeneralProps {
    service: MediaService;
}

export default function MediaServiceSettingsGeneral({service}: MediaServiceSettingsGeneralProps) {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);

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
            {service.noAuth ? null : <DisconnectButton service={service} />}
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul className="checkbox-list">
                    {service.sources?.map((source) => (
                        <li key={source.id}>
                            <input
                                id={`${id}-${source.id}`}
                                type="checkbox"
                                value={source.id}
                                defaultChecked={isSourceVisible(source)}
                                disabled={source.disabled}
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
