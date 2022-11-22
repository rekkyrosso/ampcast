import React from 'react';
import MediaService from 'types/MediaService';
import mediaServices from 'services/mediaServices';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppearanceSettings from './AppearanceSettings';
import PlaylistSettings from './PlaylistSettings';
import VisualizerSettings from './VisualizerSettings';
import MediaLibrarySettings from './MediaLibrarySettings';
import AppleMusicSettings from './MediaLibrarySettings/AppleMusicSettings';
import JellyfinSettings from './MediaLibrarySettings/JellyfinSettings';
import LastFmSettings from './MediaLibrarySettings/LastFmSettings';
import ListenBrainzSettings from './MediaLibrarySettings/ListenBrainzSettings';
import PlexSettings from './MediaLibrarySettings/PlexSettings';
import SpotifySettings from './MediaLibrarySettings/SpotifySettings';
import YouTubeSettings from './MediaLibrarySettings/YouTubeSettings';

const sources: TreeNode<React.ReactNode>[] = [
    {
        id: 'services',
        label: 'Media Services',
        value: <MediaLibrarySettings />,
        startExpanded: true,
        children: mediaServices.all.map((service) => ({
            id: service.id,
            label: <MediaSourceLabel icon={service.icon} text={service.title} />,
            value: <ServiceRouter service={service} />,
        })),
    },
    {
        id: 'visualizer',
        label: 'Visualizer',
        value: <VisualizerSettings />,
    },
    {
        id: 'playlist',
        label: 'Playlist',
        value: <PlaylistSettings />,
    },
    {
        id: 'appearance',
        label: 'Appearance',
        value: <AppearanceSettings />,
    },
];

export default (): TreeNode<React.ReactNode>[] => sources;

function ServiceRouter({service}: {service: MediaService}) {
    switch (service.id) {
        case 'apple':
            return <AppleMusicSettings />;
        case 'spotify':
            return <SpotifySettings />;
        case 'youtube':
            return <YouTubeSettings />;
        case 'plex':
            return <PlexSettings />;
        case 'jellyfin':
            return <JellyfinSettings />;
        case 'lastfm':
            return <LastFmSettings />;
        case 'listenbrainz':
            return <ListenBrainzSettings />;
    }
}
