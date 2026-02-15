import React from 'react';
import ScrollableNative from './ScrollableNative';
import ScrollableStyled from './ScrollableStyled';
import './Scrollable.scss';

export interface ScrollablePosition {
    readonly left: number;
    readonly top: number;
}

export interface ScrollableClient {
    readonly clientWidth: number;
    readonly clientHeight: number;
    readonly scrollWidth: number;
    readonly scrollHeight: number;
}

export interface ScrollableHandle {
    scrollTo: (position: Partial<ScrollablePosition>) => void;
}

export interface ScrollableProps {
    children?: React.ReactNode;
    scrollWidth?: number;
    scrollHeight?: number;
    lineHeight?: number;
    scrollAmountX?: number;
    scrollAmountY?: number;
    autoscroll?: boolean; // Automatically scroll on `dragover` events.
    onResize?: (client: ScrollableClient) => void;
    onScroll?: (position: ScrollablePosition) => void;
    ref?: React.RefObject<ScrollableHandle | null>;
}

export default function Scrollable(props: ScrollableProps) {
    // const ref = props.ref;
    // const {systemScrollbars} = usePreferences();
    // useEffect(() => {
    //     // // Force a refresh.
    //     // const handle = ref?.current;
    //     // handle?.scrollTo({left: 1, top: 1});
    //     // handle?.scrollTo({left: 0, top: 0});
    // }, [ref, systemScrollbars]);
    const Scrollable = matchMedia('(any-hover: hover)').matches
        ? ScrollableStyled
        : ScrollableNative;
    return <Scrollable {...props} />;
}
