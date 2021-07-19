import React, {useCallback, useEffect, useRef, useState} from 'react';
import ReactHowler from 'react-howler';

export interface MediaProps {
    readonly src: string;
}

export default function Media({src}: MediaProps) {
    const player = useRef<ReactHowler | null>(null);
    const seek = useRef<HTMLInputElement | null>(null);
    const interval = useRef<ReturnType<typeof setInterval>>();
    const [playing, setPlaying] = useState(false);
    const [position, setPosition] = useState(0);

    const handlePlayClick = useCallback(() => {
        setPlaying(!playing);
    }, [playing, setPlaying]);

    const handleSeekChange = useCallback(() => {
        const position = seek.current!.valueAsNumber;
        setPosition(position);
        player.current!.seek(position);
    }, [setPosition]);

    const handleEnd = useCallback(() => {
        setPlaying(false);
        setPosition(player.current!.duration());
    }, [setPlaying, setPosition]);

    useEffect(() => {
        if (playing) {
            setPosition(player.current!.seek());

            interval.current = setInterval(() => {
                setPosition(player.current!.seek());
            }, 500)
        
            return () => {
                clearInterval(interval.current!);
            }
        }
        return undefined;
      }, [playing]);

    return (
        <div>
            <ReactHowler
                html5
                src={src}
                playing={playing}
                onEnd={handleEnd}
                ref={player}
            />
            <p>
                <button onClick={handlePlayClick}>{playing ? 'Pause' : 'Play'}</button>
                <br />
                <input
                    type="range"
                    min="0"
                    max={String(player.current?.duration() ?? 0)}
                    value={String(position)}
                    onChange={handleSeekChange}
                    ref={seek}
                    style={{
                        width: '100%',
                        margin: '4px 0',
                    }}
                />
            </p>
        </div>
    );
}
