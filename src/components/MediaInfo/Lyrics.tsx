import React from 'react';
import MediaItem from 'types/MediaItem';
import {LyricsNotAvailableError} from 'services/errors';
import {t} from 'services/i18n';
import {getServiceFromSrc} from 'services/mediaServices';
import ErrorBox from 'components/Errors/ErrorBox';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import TextBox from 'components/TextBox';
import useLyrics from 'hooks/useLyrics';
import './Lyrics.scss';

export interface LyricsProps {
    item: MediaItem;
}

export default function Lyrics({item}: LyricsProps) {
    const {plainLyrics, syncedLyrics, loaded, error} = useLyrics(item);

    return (
        <div className="lyrics">
            {loaded ? (
                error ? (
                    <LyricsError item={item} error={error} />
                ) : plainLyrics ? (
                    <>
                        <TextBox>
                            {plainLyrics.map((text, index) => (
                                <p key={index}>{text}</p>
                            ))}
                        </TextBox>
                        {syncedLyrics ? (
                            <p>
                                <MediaSourceLabel
                                    icon="clock"
                                    text={t('Synchronized lyrics available')}
                                />
                            </p>
                        ) : null}
                    </>
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
                    {service?.lyricsDisabled
                        ? `Lyrics not supported for ${service.name}`
                        : error.message}
                </p>
            </div>
        );
    } else {
        return <ErrorBox error={error} reportedBy="Lyrics" />;
    }
}
