import React, {useCallback, useId, useMemo, useRef} from 'react';
import mediaServices from 'services/mediaServices';
import mediaSources from 'services/mediaSources';
import TabList, {TabItem} from 'components/TabList';
import Input from 'components/Input';
import Button from 'components/Button';
import './MediaLibrarySettings.scss';

export default function MediaLibrarySettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaLibraryGeneralSettings />,
            },
        ],
        []
    );

    return <TabList items={tabs} label="Media Services" />;
}

export function MediaLibraryGeneralSettings() {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);
    const initialServices = useMemo(() => mediaSources.getServices(), []);

    const handleSubmit = useCallback(() => {
        type HTMLInputElements = {
            [Symbol.iterator](): Iterator<HTMLInputElement>;
        };
        const newServices: string[] = [];
        const inputs = ref.current!.elements as HTMLInputElements;
        for (const input of inputs) {
            if (input.checked) {
                newServices.push(input.value);
            }
        }
        mediaSources.setServices(newServices);
    }, []);

    return (
        <form className="media-library-general-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset ref={ref}>
                <legend>Display</legend>
                <ul>
                    {mediaServices.map((service) => (
                        <li key={service.id}>
                            <Input
                                id={`${id}-${service.id}`}
                                type="checkbox"
                                value={service.id}
                                defaultChecked={initialServices.includes(service.id)}
                                disabled={service.id === 'local'}
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
