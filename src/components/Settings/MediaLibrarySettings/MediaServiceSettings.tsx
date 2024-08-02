import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import TabList, {TabItem} from 'components/TabList';
import AppleStreamingSettings from 'services/apple/components/AppleStreamingSettings';
import NavidromeMediaLibrarySettings from 'services/navidrome/components/NavidromeMediaLibrarySettings';
import PlexMediaLibrarySettings from 'services/plex/components/PlexMediaLibrarySettings';
import PlexTidalStreamingSettings from 'services/plex/components/PlexTidalStreamingSettings';
import MediaServiceSettingsGeneral from './MediaServiceSettingsGeneral';
import MediaServiceCredentials from './MediaServiceCredentials';
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
        if (service.credentialsRequired) {
            tabs.push({
                tab: 'Credentials',
                panel: <MediaServiceCredentials service={service} />,
            });
        }
        if (service.serviceType === ServiceType.PersonalMedia) {
            tabs.push({
                tab: 'Server',
                panel:
                    service.id === 'navidrome' ? (
                        <NavidromeMediaLibrarySettings service={service} />
                    ) : service.id === 'plex' ? (
                        <PlexMediaLibrarySettings service={service} />
                    ) : (
                        <PersonalMediaLibrarySettings service={service} />
                    ),
            });
        }
        if (service.serviceType === ServiceType.DataService && service.canScrobble) {
            tabs.push({
                tab: 'Scrobbling',
                panel: <ScrobblingSettings service={service} />,
            });
        }
        if (service.id === 'apple') {
            tabs.push({
                tab: 'Streaming',
                panel: <AppleStreamingSettings />,
            });
        } else if (service.id === 'plex-tidal') {
            tabs.push({
                tab: 'Streaming',
                panel: <PlexTidalStreamingSettings />,
            });
        }
        if (service.createSourceFromPin) {
            tabs.push({
                tab: 'Pinned',
                panel: <PinnedSettings service={service} />,
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
