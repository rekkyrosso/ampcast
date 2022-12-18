import React from 'react';
import MediaService from 'types/MediaService';
import PlexLogin from 'services/plex/components/PlexLogin';
import SpotifyLogin from 'services/spotify/components/SpotifyLogin';
import YouTubeLogin from 'services/youtube/components/YouTubeLogin';
import DefaultLogin from './DefaultLogin';
import './Login.scss';

export interface LoginProps {
    service: MediaService;
}

export default function Login({service}: LoginProps) {
    switch (service.id) {
        case 'plex':
            return <PlexLogin />;

        case 'spotify':
            return <SpotifyLogin />;

        case 'youtube':
            return <YouTubeLogin />;

        default:
            return <DefaultLogin service={service} />;
    }
}
