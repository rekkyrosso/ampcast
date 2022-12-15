import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceGeneralSettings from './MediaServiceGeneralSettings';
import MediaServiceScrobblingSettings from './MediaServiceScrobblingSettings';

export interface MediaServiceSettingsProps {
    service: MediaService;
}

export default function MediaServiceSettings({service}: MediaServiceSettingsProps) {
    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'General',
                panel: <MediaServiceGeneralSettings service={service} />,
            },
        ];
        if (service.scrobbler) {
            tabs.push({
                tab: 'Scrobbling',
                panel: <MediaServiceScrobblingSettings service={service} />,
            });
        }
        return tabs;
    }, [service]);

    return <TabList items={tabs} label={service.name} />;
}
