import React from 'react';
import MediaService from 'types/MediaService';
import Button from 'components/Button';
import SpotifyLogin from './SpotifyLogin';
import YouTubeLogin from './YouTubeLogin';
import './Login.scss';

export interface LoginProps {
    service: MediaService;
}

export default function Login({service}: LoginProps) {
    switch (service.id) {
        case 'spotify':
            return <SpotifyLogin />;

        case 'youtube':
            return <YouTubeLogin />;

        default:
            return (
                <div className="panel">
                    <div className="page login">
                        <p>You need to be logged in to play music from {service.title}.</p>
                        <p>
                            <Button className="branded login" onClick={service.login}>
                                Log in to {service.title}
                            </Button>
                        </p>
                        <p>
                            {/* eslint-disable-next-line react/jsx-no-target-blank */}
                            <a href={service.url} target="_blank" rel="noopener">
                                {service.url}
                            </a>
                        </p>
                    </div>
                </div>
            );
    }
}
