import './MasterPlaylist.scss';
import React, {useCallback, useRef, useState} from 'react';
import Playlist, {PlaylistProps, PlaylistLayout} from '../Playlist';
import PlayableItem from 'types/PlayableItem';

export interface MasterPlaylistProps extends Omit<PlaylistProps, 'layout' | 'items'> {};

const layout: PlaylistLayout = {
    view: 'details',
    cols: [
        {key: '#', title: '#', typeHint: 'number'},
        {key: 'title', title: 'Title'},
        {key: 'duration', title: 'Length', typeHint: 'time'},
    ],
};

export default function MasterPlaylist({onDrop, ...props}: MasterPlaylistProps) {
    const [items, setItems] = useState<PlayableItem[]>([]);

    const handleDrop = useCallback(async (event: React.DragEvent) => {
        event.preventDefault();

        const newItems = items.slice();

        for (const item of event.dataTransfer.items) {
            if (item.kind === 'file') {
                const entry = await item.getAsFileSystemHandle();
                if (entry?.kind === 'file') {
                    // handleFileEntry(entry);
                    console.log('ENTRY', entry);
                }
            }
        }
    }, [items, setItems]);

    return (
        <Playlist className="master-playlist" {...props} items={items} layout={layout} onDrop={onDrop} />
    );
}
