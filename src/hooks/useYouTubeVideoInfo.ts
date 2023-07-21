import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {getYouTubeVideoInfo} from 'services/youtube';

export default function useYouTubeVideoInfo(src: string) {
    const [service, , videoId] = src.split(':');
    const [videoInfo, setVideoInfo] = useState<MediaItem | null>(null);

    useEffect(() => {
        setVideoInfo(null);
        if (service === 'youtube' && videoId) {
            const subscription = from(getYouTubeVideoInfo(videoId)).subscribe(setVideoInfo);
            return () => subscription.unsubscribe();
        }
    }, [service, videoId]);

    return videoInfo;
}
