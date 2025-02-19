import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from './MediaServiceSettingsGeneral';
import MediaServiceCredentials from './MediaServiceCredentials';
import PersonalMediaServerSettings from './PersonalMediaServerSettings';
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
        if (
            service.credentialsRequired &&
            // Show credentials to docker users for sanity checking of server config.
            (!service.credentialsLocked || __target__ === 'docker')
        ) {
            tabs.push({
                tab: 'Credentials',
                panel: <MediaServiceCredentials service={service} />,
            });
        }
        switch (service.serviceType) {
            case ServiceType.PublicMedia: {
                const StreamingSettings = service.Components?.StreamingSettings;
                if (StreamingSettings) {
                    tabs.push({
                        tab: 'Streaming',
                        panel: <StreamingSettings service={service} />,
                    });
                }
                break;
            }
            case ServiceType.PersonalMedia: {
                const ServerSettings =
                    service.Components?.ServerSettings || PersonalMediaServerSettings;
                tabs.push({
                    tab: 'Server',
                    panel: <ServerSettings service={service} />,
                });
                break;
            }
            case ServiceType.DataService:
                if (service.canScrobble) {
                    tabs.push({
                        tab: 'Scrobbling',
                        panel: <ScrobblingSettings service={service} />,
                    });
                }
                break;
        }
        if (service.createSourceFromPin) {
            tabs.push({
                tab: 'Pins',
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
