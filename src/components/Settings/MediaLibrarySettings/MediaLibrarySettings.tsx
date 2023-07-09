import React, {useCallback, useMemo, useRef} from 'react';
import lookupSettings from 'services/lookup/lookupSettings';
import {setHiddenSources} from 'services/servicesSettings';
import TabList, {TabItem} from 'components/TabList';
import MediaLibrarySettingsGeneral from './MediaLibrarySettingsGeneral';
import LookupSettings from './LookupSettings';

export default function MediaLibrarySettings() {
    const servicesRef = useRef<HTMLFormElement>(null);
    const lookupRef = useRef<HTMLSelectElement>(null);

    const handleSubmit = useCallback(() => {
        const inputs = servicesRef.current!.elements as HTMLInputElements;
        const settings: Record<string, boolean> = {};
        for (const input of inputs) {
            if (input.type === 'checkbox') {
                settings[input.value] = !input.checked;
            }
        }
        setHiddenSources(settings);
        lookupSettings.preferredService = lookupRef.current!.value;
    }, []);

    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: (
                    <MediaLibrarySettingsGeneral
                        onSubmit={handleSubmit}
                        servicesRef={servicesRef}
                    />
                ),
            },
            {
                tab: 'Lookup',
                panel: <LookupSettings onSubmit={handleSubmit} lookupRef={lookupRef} />,
            },
        ],
        [handleSubmit]
    );

    return <TabList className="media-library-settings" items={tabs} label="Media Services" />;
}
