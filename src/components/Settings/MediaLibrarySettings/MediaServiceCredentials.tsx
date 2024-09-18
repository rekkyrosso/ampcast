import React from 'react';
import MediaService from 'types/MediaService';
import AppleCredentials from 'services/apple/components/AppleCredentials';
import LastFmCredentials from 'services/lastfm/components/LastFmCredentials';
import SpotifyCredentials from 'services/spotify/components/SpotifyCredentials';
import TidalCredentials from 'services/tidal/components/TidalCredentials';
import YouTubeCredentials from 'services/youtube/components/YouTubeCredentials';
import './MediaServiceCredentials.scss';

export interface MediaServiceCredentialsProps {
    service: MediaService;
}

export default function MediaServiceCredentials({service}: MediaServiceCredentialsProps) {
    return (
        <div className="media-service-credentials">
            <Credentials service={service} />
        </div>
    );
}

function Credentials({service}: MediaServiceCredentialsProps) {
    if (service.credentialsRequired) {
        switch (service.id) {
            case 'apple':
                return <AppleCredentials service={service} />;

            case 'lastfm':
                return <LastFmCredentials service={service} />;

            case 'spotify':
                return <SpotifyCredentials service={service} />;

            case 'tidal':
                return <TidalCredentials service={service} />;

            case 'youtube':
                return <YouTubeCredentials service={service} />;

            default:
                return (
                    <div className="note error">
                        <p>Credentials screen not found for {service.name}.</p>
                    </div>
                );
        }
    } else {
        return (
            <div className="note">
                <p>Credentials not required for {service.name}.</p>
            </div>
        );
    }
}
