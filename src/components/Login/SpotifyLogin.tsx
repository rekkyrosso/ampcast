import React from 'react';
import {login} from 'services/spotify';
import Button from 'components/Button';

export default function SpotifyLogin() {
    return (
        <div className="panel">
            <div className="page login">
                <p>You need to be logged in to play music from Spotify*.</p>
                <p>
                    <Button className="branded login" onClick={login}>
                        Log in to Spotify
                    </Button>
                </p>
                <p>
                    <small>
                        <em>*Spotify Premium required.</em>
                    </small>
                </p>
            </div>
        </div>
    );
}
