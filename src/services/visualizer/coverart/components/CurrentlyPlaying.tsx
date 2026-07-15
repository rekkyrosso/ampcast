import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Color from 'colorjs.io';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import type CovertArtPlayer from '../CovertArtPlayer';
import {isDark, isLighter} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {isProviderSupported} from 'services/visualizer';
import Icon from 'components/Icon';
import {Thumbnail} from 'components/MediaInfo';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import ProvidedBy from 'components/Media/ProvidedBy';
import PlaybackState from 'components/Media/PlaybackState';
import ProgressBar from 'components/Media/ProgressBar';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useFontSize from 'hooks/useFontSize';
import useOnResize from 'hooks/useOnResize';
import useVisualizerSettings from 'hooks/useVisualizerSettings';
import SynchronizedLyrics from './SynchronizedLyrics';
import useCoverArtColors from './useCoverArtColors';

export interface CurrentlyPlayingProps {
    item: PlaylistItem | null;
    player?: CovertArtPlayer;
    hidden?: boolean;
}

export default function CurrentlyPlaying({item, player, hidden = false}: CurrentlyPlayingProps) {
    const ref = useRef<HTMLDivElement>(null);
    const service = item ? getServiceFromSrc(item) : undefined;
    const [isLoggedIn, setIsLoggedIn] = useState(() => service?.isLoggedIn() ?? false);
    const {coverArtBeats, coverArtLyrics, fullscreenProgress} = useVisualizerSettings();
    const [arrange, setArrange] = useState<'row' | 'column'>('row');
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [thumbnailSize, setThumbnailSize] = useState(0);
    const fontSize = useFontSize(ref);
    const [covertArtUrl, setCovertArtUrl] = useState('');
    const coverArtColors = useCoverArtColors(covertArtUrl);
    const [tone, setTone] = useState<'light' | 'dark'>('dark');
    const [textTone, setTextTone] = useState<'light' | 'dark'>('light');
    const [textShadow, setTextShadow] = useState(false);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const currentlyPlaying = useCurrentlyPlaying();
    const isPlayingTrack = item && (!item.linearType || item.linearType === LinearType.MusicTrack);
    const isPlayingRadio = currentlyPlaying?.linearType === LinearType.Station;
    const beatsEnabled = coverArtBeats && (item ? isProviderSupported('waveform', item) : true);
    const itemId = item?.id;

    useEffect(() => {
        player?.appendTo(ref.current!);
    }, [player]);

    useLayoutEffect(() => {
        if (service) {
            const subscription = service.observeIsLoggedIn().subscribe(setIsLoggedIn);
            return () => subscription.unsubscribe();
        } else {
            setIsLoggedIn(false);
        }
    }, [service]);

    useLayoutEffect(() => {
        setCovertArtUrl('');
    }, [itemId]);

    useEffect(() => {
        if (width * height * fontSize > 0) {
            if (width > height) {
                const maxHeight = height - (beatsEnabled ? 6 : 3) * fontSize;
                setThumbnailSize(Math.min(Math.floor(width * 0.45), maxHeight));
                setArrange('row');
            } else {
                const maxWidth = width - 3 * fontSize;
                setThumbnailSize(Math.min(Math.floor(height * 0.45), maxWidth));
                setArrange('column');
            }
        }
    }, [width, height, fontSize, beatsEnabled]);

    useOnResize(ref, ({width, height}) => {
        setWidth(width);
        setHeight(height);
    });

    const handleThumbnailLoad = useCallback((url: string) => {
        setCovertArtUrl(url);
    }, []);

    const handleThumbnailError = useCallback(() => {
        setCovertArtUrl('');
    }, []);

    useEffect(() => {
        if (player) {
            const {
                backgroundColors: [backgroundColor, backgroundColor2],
                textColor,
                beatsColor,
            } = coverArtColors;
            const textColorHsl = new Color(textColor).to('hsl');
            setStyle({
                '--background-color': backgroundColor,
                '--text-color-h': `${textColorHsl.h || 0}`,
                '--text-color-s': `${Number(textColorHsl.s)}%`,
                '--text-color-l': `${Number(textColorHsl.l)}%`,
            } as React.CSSProperties);
            setTone(isDark(backgroundColor) ? 'dark' : 'light');
            setTextTone(isDark(textColor) ? 'dark' : 'light');
            setTextShadow(isLighter(textColor, backgroundColor))
            player.backgroundColor = backgroundColor;
            player.backgroundColor2 = backgroundColor2;
            player.waveColor = textColor;
            player.beatsColor = beatsColor;
        }
    }, [player, coverArtColors]);

    return (
        <div
            className={`currently-playing arrange-${arrange} themed ${tone} text-${textTone} ${beatsEnabled ? 'beats-enabled' : ''}`}
            hidden={hidden}
            style={
                {
                    ...style,
                    '--thumbnail-size': `${thumbnailSize}px`,
                } as React.CSSProperties
            }
            ref={ref}
        >
            <div className="animated-background" />
            {item ? (
                <>
                    <div className="currently-playing-thumbnail">
                        <Thumbnail
                            item={item}
                            size={800}
                            extendedSearch={!hidden}
                            onLoad={handleThumbnailLoad}
                            onError={handleThumbnailError}
                            key={`${itemId}/${isLoggedIn}/thumbnail`}
                        />
                        <ProvidedBy item={item} />
                    </div>
                    <div className={`currently-playing-text ${textShadow ? 'text-shadow' : ''}`}>
                        <div className="metadata">
                            <h3 className="title">{item.title}</h3>
                            {item.artists?.length && item.linearType !== LinearType.Station ? (
                                <h4 className="sub-title">
                                    {isPlayingTrack ? (
                                        <MediaSourceLabel
                                            icon="artist"
                                            text={item.artists.join(' ● ')}
                                        />
                                    ) : (
                                        item.artists.join(', ')
                                    )}
                                </h4>
                            ) : null}
                            {item.linearType !== LinearType.Station &&
                            (isPlayingRadio ? item.stationName : item.album) ? (
                                <h5 className="sub-title">
                                    {isPlayingRadio ? (
                                        <MediaSourceLabel icon="radio" text={item.stationName} />
                                    ) : (
                                        <MediaSourceLabel
                                            icon="album"
                                            text={
                                                item.year
                                                    ? `${item.album} (${item.year})`
                                                    : item.album
                                            }
                                        />
                                    )}
                                </h5>
                            ) : null}
                        </div>
                        {coverArtLyrics && !hidden ? (
                            <SynchronizedLyrics
                                item={item}
                                key={`${itemId}/${isLoggedIn}/lyrics`}
                            />
                        ) : null}
                    </div>
                    {isPlayingRadio ? <Icon name="radio" className="live-radio" /> : null}
                </>
            ) : null}
            <div className="beats-player" />
            <PlaybackState />
            {fullscreenProgress ? <ProgressBar /> : null}
        </div>
    );
}
