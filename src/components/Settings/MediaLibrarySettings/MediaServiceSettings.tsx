import React, {useCallback, useId, useMemo, useRef} from 'react';
import MediaService from 'types/MediaService';
import mediaSources from 'services/mediaSources';
import TabList, {TabItem} from 'components/TabList';
import Input from 'components/Input';
import Button from 'components/Button';
import useObservable from 'hooks/useObservable';

export interface MediaServiceSettingsProps {
    service: MediaService;
}

export default function MediaServiceSettings({service}: MediaServiceSettingsProps) {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceGeneralSettings service={service} />,
            },
        ],
        [service]
    );

    return <TabList items={tabs} label={service.title} />;
}

export function MediaServiceGeneralSettings({service}: MediaServiceSettingsProps) {
    const id = useId();
    const ref = useRef<HTMLFieldSetElement>(null);
    const connected = useObservable(service.observeIsLoggedIn, false);
    const initialSources = useMemo(() => mediaSources.getSources(service.id), [service]);

    const handleSubmit = useCallback(() => {
        type HTMLInputElements = {
            [Symbol.iterator](): Iterator<HTMLInputElement>;
        };
        const newSources: string[] = [];
        const inputs = ref.current!.elements as HTMLInputElements;
        for (const input of inputs) {
            if (input.checked) {
                newSources.push(input.value);
            }
        }
        mediaSources.setSources(service.id, newSources);
    }, [service]);

    return (
        <form
            className={`media-library-settings ${service.id}-settings`}
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
                                defaultChecked={initialSources.includes(source.id)}
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
