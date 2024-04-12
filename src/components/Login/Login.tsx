import React from 'react';
import MediaService from 'types/MediaService';
import AppleLogin from 'services/apple/components/AppleLogin';
import LastFmLogin from 'services/lastfm/components/LastFmLogin';
import PlexLogin from 'services/plex/components/PlexLogin';
import PlexTidalLogin from 'services/plex/components/PlexTidalLogin';
import SpotifyLogin from 'services/spotify/components/SpotifyLogin';
import YouTubeLogin from 'services/youtube/components/YouTubeLogin';
import DefaultLogin from './DefaultLogin';
import './Login.scss';

export interface LoginProps {
    service: MediaService;
}

export default function Login({service}: LoginProps) {
    return (
        <div className="panel">
            <div className={`page login login-${service.id}`}>
                <ServiceLogin service={service} />
            </div>
        </div>
    );
}

function ServiceLogin({service}: LoginProps) {
    switch (service.id) {
        case 'apple':
            return <AppleLogin service={service} />;

        case 'lastfm':
            return <LastFmLogin service={service} />;

        case 'plex':
            return <PlexLogin service={service} />;

        case 'plex-tidal':
            return <PlexTidalLogin service={service} />;

        case 'spotify':
            return <SpotifyLogin service={service} />;

        case 'youtube':
            return <YouTubeLogin service={service} />;

        default:
            return <DefaultLogin service={service} />;
    }
}
