import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from './MediaServiceSettingsGeneral';
import PinnedSettings from './PinnedSettings';
import ScrobblingSettings from './ScrobblingSettings';
import './MediaServiceSettings.scss';

export interface MediaServiceSettingsProps {
    service: MediaService;
}

export default function MediaServiceSettings({service}: MediaServiceSettingsProps) {
    const tabs: TabItem[] = useMemo(() => {
        const tabs = [
            {
                tab: 'General',
                panel: <MediaServiceSettingsGeneral service={service} />,
            },
        ];
        if (service.createSourceFromPin) {
            tabs.push({
                tab: 'Pinned',
                panel: <PinnedSettings service={service} />,
            });
        }
        if (service.scrobbler) {
            tabs.push({
                tab: 'Scrobbling',
                panel: <ScrobblingSettings service={service} />,
            });
        }
        return tabs;
    }, [service]);

    return (
        <TabList
            className={`media-service-settings ${service.id}-settings`}
            items={tabs}
            label={service.name}
        />
    );
}
