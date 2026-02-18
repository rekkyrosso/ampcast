import React, {useCallback, useEffect, useRef, useState} from 'react';
import Color from 'colorjs.io';
import ColorThief, {RGBColor} from 'colorthief';
import {TinyColor, mostReadable} from '@ctrl/tinycolor';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import type CovertArtPlayer from '../CovertArtPlayer';
import {filterNotEmpty} from 'utils';
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

const defaultPalette = ['#3e3e3e', '#ebebeb'];

export interface CurrentlyPlayingProps {
    item: PlaylistItem | null;
    player?: CovertArtPlayer;
    hidden?: boolean;
}

export default function CurrentlyPlaying({item, player, hidden = false}: CurrentlyPlayingProps) {
    const ref = useRef<HTMLDivElement>(null);
    const {coverArtBeats, fullscreenProgress} = useVisualizerSettings();
    const [arrange, setArrange] = useState<'row' | 'column'>('row');
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [thumbnailSize, setThumbnailSize] = useState(0);
    const fontSize = useFontSize(ref);
    const [palette, setPalette] = useState<string[]>(defaultPalette);
    const [tone, setTone] = useState<'light' | 'dark'>('dark');
    const [textTone, setTextTone] = useState<'light' | 'dark'>('light');
    const [style, setStyle] = useState<React.CSSProperties>({});
    const currentlyPlaying = useCurrentlyPlaying();
    const isPlayingTrack = item && (!item.linearType || item.linearType === LinearType.MusicTrack);
    const isPlayingRadio = currentlyPlaying?.linearType === LinearType.Station;
    const beatsEnabled = coverArtBeats && (item ? isProviderSupported('waveform', item) : true);

    useEffect(() => {
        player?.appendTo(ref.current!);
    }, [player]);

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

    const handleThumbnailLoad = useCallback((src: string) => {
        const colorThief = new ColorThief();
        const img = new Image();
        const onerror = () => setPalette(defaultPalette);
        const onload = (img: HTMLImageElement) => {
            try {
                const toRGB = (color: RGBColor) => `rgb(${color.map(Number)})`;
                const toColor = (color: RGBColor) => new TinyColor(toRGB(color)).toHexString();
                const backgroundColor = toColor(colorThief.getColor(img));
                const isDark = new TinyColor(backgroundColor).isDark();
                const palette = colorThief.getPalette(img)?.map(toColor) || defaultPalette;
                const textColor =
                    mostReadable(backgroundColor, palette, {
                        includeFallbackColors: true,
                        level: 'AA',
                        size: 'small',
                    })?.toHexString() || (isDark ? '#ebebeb' : '#000000');
                setPalette([backgroundColor, textColor, ...palette]);
            } catch {
                onerror();
            }
        };
        img.crossOrigin = 'anonymous';
        img.src = src;

        if (img.complete) {
            onload(img);
        } else {
            img.onload = () => onload(img);
            img.onerror = () => {
                // Try again but break the cache.
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `${src}${src.includes('?') ? '&' : '?'}ampcast=1`;

                if (img.complete) {
                    onload(img);
                } else {
                    img.onerror = onerror;
                    img.onload = () => onload(img);
                }
            };
        }
    }, []);

    const handleThumbnailError = useCallback(() => {
        setPalette(defaultPalette);
    }, []);

    useEffect(() => {
        if (!player) {
            return;
        }
        const HEX = {format: 'hex'};
        const [backgroundColor, textColor] = palette.slice(0, 2).map((color) => new Color(color));
        const {h, s, l} = textColor.to('hsl');
        setStyle({
            '--background-color': backgroundColor.toString(HEX),
            '--text-color-h': `${h || 0}`,
            '--text-color-s': `${Number(s)}%`,
            '--text-color-l': `${Number(l)}%`,
        } as React.CSSProperties);
        setTone(backgroundColor.to('lch').l! < 50 ? 'dark' : 'light');
        setTextTone(textColor.to('lch').l! >= 50 ? 'light' : 'dark');
        player.backgroundColor = backgroundColor.toString(HEX);
        player.waveColor = textColor.toString(HEX);
        const [, , ...rest] = palette;
        if (rest.length === 0) {
            player.beatsColor = textColor.toString(HEX);
            player.backgroundColor2 = backgroundColor.toString(HEX);
        } else {
            let colors = rest.map((color) => new Color(color));
            colors = filterNotEmpty(colors, (color) => backgroundColor.deltaE2000(color) > 20);
            colors = filterNotEmpty(colors, (color) => textColor.deltaE2000(color) > 10);
            const backgroundColors = filterNotEmpty(colors, (color) => color.to('hsl').s! > 20);
            let backgroundColor2 = backgroundColors.toSorted(
                (a, b) =>
                    backgroundColor.contrast(a, 'Lstar') - backgroundColor.contrast(b, 'Lstar')
            )[0];
            while (backgroundColor.contrast(backgroundColor2, 'Lstar') > 25) {
                backgroundColor2 = backgroundColor.mix(backgroundColor2, 0.9);
            }
            const beatsColors = colors
                .filter(
                    (color) =>
                        backgroundColor.deltaE2000(color) > 10 &&
                        backgroundColor2.deltaE2000(color) > 10
                )
                .toSorted((a, b) => b.to('hsl').s! - a.to('hsl').s!);
            player.beatsColor = (beatsColors[0] || textColor).toString(HEX);
            player.backgroundColor2 = backgroundColor2.toString(HEX);
        }
    }, [player, palette]);

    return (
        <div
            className={`currently-playing arrange-${arrange} themed ${tone} text-${textTone} `}
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
                            key={item.id}
                        />
                        <ProvidedBy item={item} />
                    </div>
                    <div className="currently-playing-text">
                        <h3 className="title">{item.title}</h3>
                        {item.artists?.length ? (
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
                                            item.year ? `${item.album} (${item.year})` : item.album
                                        }
                                    />
                                )}
                            </h5>
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
