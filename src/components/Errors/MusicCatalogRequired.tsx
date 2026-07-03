import React, {useCallback, useId, useRef} from 'react';
import {MusicCatalogRequiredError} from 'services/errors';
import Button from 'components/Button';
import './MusicCatalogRequired.scss';

export interface MusicCatalogRequiredProps {
    error: MusicCatalogRequiredError;
}

export default function MusicCatalogRequired({error}: MusicCatalogRequiredProps) {
    const id = useId();
    const preventFutureMessagesRef = useRef<HTMLInputElement | null>(null);

    const proceed = useCallback(() => {
        error.ignore(preventFutureMessagesRef.current!.checked);
    }, [error]);

    return (
        <div className="music-catalog-required">
            <p>
                You need to be logged into Apple Music or Spotify for this feature to be useful (or
                own a very large personal media collection).
            </p>
            <p>
                <Button onClick={proceed}>Proceed</Button>
            </p>
            <p className="prevent-future-messages">
                <input id={id} type="checkbox" ref={preventFutureMessagesRef} />
                <label htmlFor={id}>Don&apos;t show this message again</label>
            </p>
        </div>
    );
}
