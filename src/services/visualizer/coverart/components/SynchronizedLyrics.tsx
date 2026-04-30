import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaItem from 'types/MediaItem';
import useCurrentTime from 'hooks/useCurrentTime';
import useIsFullscreen from 'hooks/useIsFullscreen';
import useLyrics from 'hooks/useLyrics';
import useOnResize from 'hooks/useOnResize';
import './SynchronizedLyrics.scss';

export interface SynchronizedLyricsProps {
    item: MediaItem;
}

export default function SynchronizedLyrics({item}: SynchronizedLyricsProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const isFullscreen = useIsFullscreen();
    const [hidden, setHidden] = useState(true);
    const {syncedLyrics} = useLyrics(item);
    const currentTime = useCurrentTime();
    const currentIndex =
        syncedLyrics?.findIndex(
            (line) => currentTime >= line.startTime && currentTime < line.endTime
        ) ?? -1;

    const scrollIntoView = useCallback(
        (currentIndex: number, behavior: ScrollOptions['behavior'] = 'instant') => {
            const container = ref.current as HTMLElement;
            const currentLine = container?.querySelector(
                `p:nth-child(${currentIndex + 1})`
            ) as HTMLElement;
            if (currentLine) {
                // Imitate `scrollIntoView({block: 'center'})`.
                // `scrollIntoView` will scroll the document if necessary which causes layout issues.
                const top =
                    currentLine.offsetTop - (container.clientHeight - currentLine.offsetHeight) / 2;
                container.scrollTo({top, behavior});
            }
        },
        []
    );

    useOnResize(ref, () => {
        scrollIntoView(currentIndex);
    });

    useEffect(() => {
        scrollIntoView(currentIndex, 'smooth');
    }, [scrollIntoView, currentIndex]);

    useEffect(() => {
        const lyrics = ref.current;
        if (lyrics) {
            const root = lyrics.parentElement;
            if (root) {
                const observer = new IntersectionObserver(
                    ([entry]) => setHidden(!entry.isIntersecting),
                    {root, threshold: 1}
                );
                const timer = setTimeout(() => observer.observe(lyrics), 100);
                return () => {
                    clearTimeout(timer);
                    observer.disconnect();
                };
            }
        }
        // Recreating the observer fixes a bug when toggling fullscreen.
    }, [isFullscreen]);

    return (
        <div className="synchronized-lyrics" hidden={hidden} ref={ref}>
            {syncedLyrics?.map((line, index) => (
                <p className={index === currentIndex ? 'current' : undefined} key={line.startTime}>
                    {/\S/.test(line.text) ? line.text : '♫ ♫ ♫'}
                </p>
            ))}
        </div>
    );
}
