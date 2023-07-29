import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import TabList, {TabItem} from 'components/TabList';
import AppleBetaSettings from 'services/apple/components/AppleBetaSettings';
import PlexTidalStreamingSettings from 'services/plex/components/PlexTidalStreamingSettings';
import MediaServiceSettingsGeneral from './MediaServiceSettingsGeneral';
import PersonalMediaLibrarySettings from './PersonalMediaLibrarySettings';
import PinnedSettings from './PinnedSettings';
import ScrobblingSettings from './ScrobblingSettings';

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
        if ('libraryId' in service) {
            tabs.push({
                tab: 'Library',
                panel: <PersonalMediaLibrarySettings service={service} />,
            });
        }
        if (service.serviceType === ServiceType.Scrobbler) {
            tabs.push({
                tab: 'Scrobbling',
                panel: <ScrobblingSettings service={service} />,
            });
        }
        if (service.createSourceFromPin) {
            tabs.push({
                tab: 'Pinned',
                panel: <PinnedSettings service={service} />,
            });
        }
        if (service.id === 'apple') {
            tabs.push({
                tab: 'Beta',
                panel: <AppleBetaSettings />,
            });
        }
        if (service.id === 'plex-tidal') {
            tabs.push({
                tab: 'Streaming',
                panel: <PlexTidalStreamingSettings />,
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
