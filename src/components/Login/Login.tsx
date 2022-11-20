import React from 'react';
import MediaService from 'types/MediaService';
import DefaultLogin from './DefaultLogin';
import PlexLogin from './PlexLogin';
import SpotifyLogin from './SpotifyLogin';
import YouTubeLogin from './YouTubeLogin';
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
