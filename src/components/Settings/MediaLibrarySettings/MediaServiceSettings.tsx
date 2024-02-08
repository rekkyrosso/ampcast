import React, {useMemo} from 'react';
import MediaService from 'types/MediaService';
import ServiceType from 'types/ServiceType';
import {sp_client_id, yt_client_id} from 'services/credentials';
import TabList, {TabItem} from 'components/TabList';
import AppleBetaSettings from 'services/apple/components/AppleBetaSettings';
import PlexMediaLibrarySettings from 'services/plex/components/PlexMediaLibrarySettings';
import PlexTidalStreamingSettings from 'services/plex/components/PlexTidalStreamingSettings';
import SpotifyCredentials from 'services/spotify/components/SpotifyCredentials';
import YouTubeCredentials from 'services/youtube/components/YouTubeCredentials';
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
        if (service.id === 'spotify' && !sp_client_id) {
            tabs.push({
                tab: 'Credentials',
                panel: <SpotifyCredentials />,
            });
        }
        if (service.id === 'youtube' && !yt_client_id) {
            tabs.push({
                tab: 'Credentials',
                panel: <YouTubeCredentials />,
            });
        }
        if ('libraryId' in service) {
            tabs.push({
                tab: 'Library',
                panel:
                    service.id === 'plex' ? (
                        <PlexMediaLibrarySettings />
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
        if (service.id === 'plex-tidal') {
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
        if (service.id === 'apple') {
            tabs.push({
                tab: 'Beta',
                panel: <AppleBetaSettings />,
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
