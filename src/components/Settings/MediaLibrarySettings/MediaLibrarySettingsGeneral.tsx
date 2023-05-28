import React, {useCallback, useId, useRef} from 'react';
import {getAllServices} from 'services/mediaServices';
import {isVisible, setHidden} from 'services/servicesSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export default function MediaLibrarySettingsGeneral() {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);

    const handleSubmit = useCallback(() => {
        const inputs = ref.current!.elements as HTMLInputElements;
        const settings: Record<string, boolean> = {};
        for (const input of inputs) {
            settings[input.value] = !input.checked;
        }
        setHidden(settings);
    }, []);

    return (
        <form className="media-library-settings-general" method="dialog" onSubmit={handleSubmit}>
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul>
                    {getAllServices().map((service) => (
                        <li key={service.id}>
                            <input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={isVisible(service)}
                            />
                            <label htmlFor={`${id}-${service.id}`}>{service.name}</label>
                        </li>
                    ))}
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
