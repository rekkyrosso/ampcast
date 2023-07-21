import React from 'react';
import {getAllServices} from 'services/mediaServices';
import {TreeNode} from 'components/TreeView';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import AppearanceSettings from './AppearanceSettings';
import MediaLibrarySettings from './MediaLibrarySettings';
import MediaServiceSettings from './MediaLibrarySettings/MediaServiceSettings';
import PlaylistSettings from './PlaylistSettings';
import VisualizerSettings from './VisualizerSettings';

const sources: TreeNode<React.ReactNode>[] = [
    {
        id: 'services',
        label: <MediaSourceLabel text="Media Services" icon="globe" />,
        value: <MediaLibrarySettings />,
        startExpanded: true,
        children: getAllServices().map((service) => ({
            id: service.id,
            label: <MediaSourceLabel icon={service.icon} text={service.name} />,
            value: <MediaServiceSettings service={service} key={service.id} />,
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
