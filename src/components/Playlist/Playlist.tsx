import './Playlist.scss';
import React from 'react';
import ListView, {ListViewProps, ListViewLayout} from '../ListView';
import PlayableItem from 'types/PlayableItem';

export interface PlaylistProps extends Omit<ListViewProps<PlayableItem>, 'itemKey' | 'layout'> {
    readonly layout?: ListViewLayout<PlayableItem>;
};

export type PlaylistLayout = ListViewLayout<PlayableItem>;

const defaultLayout: PlaylistLayout = {
    view: 'details',
    cols: [
        {key: 'artist', title: 'Artist'},
        {key: 'title', title: 'Title'},
        {key: 'album', title: 'Album'},
        {key: 'duration', title: 'Length', typeHint: 'time'},
        {key: 'genre', title: 'Genre'},
    ],
};

export default function Playlist({
    className = '',
    layout = defaultLayout,
    ...props
}: PlaylistProps) {
    return (
        <ListView {...props} className={`playlist ${className}`} layout={layout} itemKey="src" />
    );
}
