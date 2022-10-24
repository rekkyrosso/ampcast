import React from 'react';
import spotify, {login} from 'services/spotify';
import Button from 'components/Button';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';

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
                    <ExternalLink href={spotify.url}>
                        <Icon name={spotify.icon} />
                        {spotify.url}
                    </ExternalLink>
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
