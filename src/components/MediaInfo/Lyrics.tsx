import React from 'react';
import MediaItem from 'types/MediaItem';
import {LyricsNotAvailableError} from 'services/errors';
import {getServiceFromSrc, isBranded} from 'services/mediaServices';
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
            {loaded ? (
                error ? (
                    <LyricsError item={item} error={error} />
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
            )}
        </div>
    );
}

function LyricsError({item, error}: LyricsProps & {error: unknown}) {
    if (error instanceof LyricsNotAvailableError) {
        const service = getServiceFromSrc(item);
        return (
            <div className="note lyrics-not-available">
                <p>
                    {service && isBranded(service)
                        ? `Lyrics not available for ${service.name}`
                        : error.message}
                </p>
            </div>
        );
    } else {
        return <ErrorBox error={error} reportedBy="Lyrics" />;
    }
}
