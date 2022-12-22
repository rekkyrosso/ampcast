import {useEffect, useState} from 'react';
import {MediaSourceIconName} from 'components/Icon';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import MediaType from 'types/MediaType';

export default function useVideoSourceIcon(): MediaSourceIconName | '' {
    const media = useCurrentlyPlaying();
    const visualizer = useCurrentVisualizer();
    const [icon, setIcon] = useState<MediaSourceIconName | ''>('');

    useEffect(() => {
        if (media?.src.startsWith('youtube:')) {
            setIcon('youtube');
        } else if (media?.src.startsWith('apple:') && media?.mediaType === MediaType.Video) {
            setIcon('apple');
        } else if (
            visualizer?.providerId === 'ambientvideo' &&
            visualizer?.src.startsWith('youtube:')
        ) {
            setIcon('youtube');
        } else {
            setIcon('');
        }
    }, [media, visualizer]);

    return icon;
}
