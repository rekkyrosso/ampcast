import React, {useCallback, useRef, useState} from 'react';
import getYouTubeID from 'get-youtube-id';
import playlist from 'services/playlist';
import Icon from 'components/Icon';
import {getYouTubeVideoInfo} from '../youtube';
import {getYouTubeVideoDuration} from '../YouTubeLoader';
import './AddYouTubeVideo.scss';

export default function AddYouTubeVideo() {
    const ref = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState('');

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        try {
            event.preventDefault();
            const url = ref.current!.value;
            const videoId = getYouTubeID(url);
            const item = await getYouTubeVideoInfo(videoId!);
            const duration = await getYouTubeVideoDuration(item.src);
            await playlist.add({...item, duration});
            setMessage('Queued');
        } catch (err: any) {
            setMessage(err.message || 'This video cannot be embedded');
        }
    }, []);

    const handleInput = useCallback(() => {
        setMessage('');
        const url = ref.current!.value;
        let validityMessage = 'Not a valid YouTube url.';
        if (/^https?/.test(url) && /youtu\.?be/.test(url)) {
            validityMessage = 'Not a YouTube video.';
            const videoId = getYouTubeID(url);
            if (videoId) {
                validityMessage = '';
            }
        }
        ref.current!.setCustomValidity(validityMessage);
    }, []);

    return (
        <form className="add-youtube-video" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Add video from YouTube url:</legend>
                <p className="text-with-button">
                    <input type="url" required onInput={handleInput} ref={ref} />
                    <button title="Add to playlist">
                        <Icon name="playlist-add" />
                    </button>
                </p>
                <p>
                    <output>{message}</output>
                </p>
            </fieldset>
        </form>
    );
}
