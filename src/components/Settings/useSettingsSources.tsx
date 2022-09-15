import React from 'react';
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
        children: [
            {
                id: 'apple',
                label: <MediaSourceLabel icon="apple" text="Apple Music" />,
                value: <AppleMusicSettings />,
            },
            {
                id: 'spotify',
                label: <MediaSourceLabel icon="spotify" text="Spotify" />,
                value: <SpotifySettings />,
            },
            {
                id: 'youtube',
                label: <MediaSourceLabel icon="youtube" text="YouTube" />,
                value: <YouTubeSettings />,
            },
            {
                id: 'plex',
                label: <MediaSourceLabel icon="plex" text="Plex" />,
                value: <PlexSettings />,
            },
            {
                id: 'jellyfin',
                label: <MediaSourceLabel icon="jellyfin" text="Jellyfin" />,
                value: <JellyfinSettings />,
            },
            {
                id: 'lastfm',
                label: <MediaSourceLabel icon="lastfm" text="last.fm" />,
                value: <LastFmSettings />,
            },
            {
                id: 'listenbrainz',
                label: <MediaSourceLabel icon="listenbrainz" text="ListenBrainz" />,
                value: <ListenBrainzSettings />,
            },
        ],
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
        id: 'playback',
        label: 'Playback',
        value: <div />,
    },
    {
        id: 'appearance',
        label: 'Appearance',
        value: <AppearanceSettings />,
    },
];

export default function useSettingsSources(): TreeNode<React.ReactNode>[] {
    return sources;
}
