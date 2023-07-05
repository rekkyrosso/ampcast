import React from 'react';
import MediaService from 'types/MediaService';
import {getAllServices} from 'services/mediaServices';
import AppleSettings from 'services/apple/components/AppleSettings';
import EmbySettings from 'services/emby/components/EmbySettings';
import JellyfinSettings from 'services/jellyfin/components/JellyfinSettings';
import LastFmSettings from 'services/lastfm/components/LastFmSettings';
import ListenBrainzSettings from 'services/listenbrainz/components/ListenBrainzSettings';
import NavidromeSettings from 'services/navidrome/components/NavidromeSettings';
import PlexSettings from 'services/plex/components/PlexSettings';
import SpotifySettings from 'services/spotify/components/SpotifySettings';
import SubsonicSettings from 'services/subsonic/components/SubsonicSettings';
import YouTubeSettings from 'services/youtube/components/YouTubeSettings';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppearanceSettings from './AppearanceSettings';
import PlaylistSettings from './PlaylistSettings';
import VisualizerSettings from './VisualizerSettings';
import MediaLibrarySettings from './MediaLibrarySettings';

const sources: TreeNode<React.ReactNode>[] = [
    {
        id: 'services',
        label: <MediaSourceLabel text="Media Services" icon="globe" />,
        value: <MediaLibrarySettings />,
        startExpanded: true,
        children: getAllServices().map((service) => ({
            id: service.id,
            label: <MediaSourceLabel icon={service.icon} text={service.name} />,
            value: <ServiceRouter service={service} />,
        })),
    },
    {
        id: 'visualizer',
        label: <MediaSourceLabel text="Visualizer" icon="visualizer" />,
        value: <VisualizerSettings />,
    },
    {
        id: 'playlist',
        label: <MediaSourceLabel text="Playlist" icon="playlist" />,
        value: <PlaylistSettings />,
    },
    {
        id: 'appearance',
        label: <MediaSourceLabel text="Appearance" icon="palette" />,
        value: <AppearanceSettings />,
    },
];

export default (): TreeNode<React.ReactNode>[] => sources;

function ServiceRouter({service}: {service: MediaService}) {
    switch (service.id) {
        case 'apple':
            return <AppleSettings />;

        case 'spotify':
            return <SpotifySettings />;

        case 'youtube':
            return <YouTubeSettings />;

        case 'emby':
            return <EmbySettings />;

        case 'plex':
            return <PlexSettings />;

        case 'jellyfin':
            return <JellyfinSettings />;

        case 'navidrome':
            return <NavidromeSettings />;

        case 'subsonic':
            return <SubsonicSettings />;

        case 'lastfm':
            return <LastFmSettings />;

        case 'listenbrainz':
            return <ListenBrainzSettings />;
    }
}
