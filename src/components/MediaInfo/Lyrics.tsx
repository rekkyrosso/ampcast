import React from 'react';
import MediaItem from 'types/MediaItem';
import {canShowLyrics} from 'services/lyrics';
import {getServiceFromSrc} from 'services/mediaServices';
import ErrorBox from 'components/Errors/ErrorBox';
import TextBox from 'components/TextBox';
import useLyrics from 'hooks/useLyrics';

export interface LyricsProps {
    item: MediaItem;
}

export default function Lyrics({item}: LyricsProps) {
    const {lyrics, loaded, error} = useLyrics(item);

    return (
        <div className="media-info-lyrics">
            {canShowLyrics(item) ? (
                loaded ? (
                    error ? (
                        <ErrorBox error={error} reportedBy="Lyrics" />
                    ) : lyrics ? (
                        <TextBox>
                            {lyrics?.plain.map((text, index) => (
                                <p key={index}>{text}</p>
                            ))}
                        </TextBox>
                    ) : (
                        <p>Lyrics not found</p>
                    )
                ) : (
                    <p>Loading lyrics…</p>
                )
            ) : (
                <LyricsNotAvailable item={item} />
            )}
        </div>
    );
}

function LyricsNotAvailable({item}: LyricsProps) {
    const service = getServiceFromSrc(item);
    return (
        <div className="note">
            <p>{service ? `Lyrics not available for ${service.name}.` : 'Lyrics not available.'}</p>
        </div>
    );
}
