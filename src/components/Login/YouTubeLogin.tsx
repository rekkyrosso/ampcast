import React from 'react';
import youtube, {login} from 'services/youtube';
import Button from 'components/Button';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';

export default function YouTubeLogin() {
    return (
        <div className="panel">
            <div className="page login">
                <p>
                    You can still play YouTube videos without being logged in.
                    <br />
                    But you need to be logged in to search for music and access your playlists.
                </p>
                <p>
                    <Button className="branded login" onClick={login}>
                        Log in to YouTube
                    </Button>
                </p>
                <p>
                    <ExternalLink href={youtube.url}>
                        <Icon name={youtube.icon} />
                        {youtube.url}
                    </ExternalLink>
                </p>
            </div>
        </div>
    );
}
