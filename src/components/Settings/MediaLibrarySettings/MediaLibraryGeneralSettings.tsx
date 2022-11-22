import React, {useCallback, useId, useRef} from 'react';
import mediaServices from 'services/mediaServices';
import {isVisible, setHidden} from 'services/servicesSettings';
import Input from 'components/Input';
import Button from 'components/Button';

export default function MediaLibraryGeneralSettings() {
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
        <form className="media-library-general-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul>
                    {mediaServices.all.map((service) => (
                        <li key={service.id}>
                            <Input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={isVisible(service)}
                            />
                            <label htmlFor={`${id}-${service.id}`}>{service.title}</label>
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
