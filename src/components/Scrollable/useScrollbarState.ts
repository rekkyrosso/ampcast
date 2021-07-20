import {useCallback, useReducer} from 'react';
import scrollbarReducer, {ScrollbarState} from './scrollbarReducer';

const initialState: ScrollbarState = {
    position: 0,
    max: 0,
    clientSize: 0,
    scrollSize: 0,
};

export default function useScrollbarState() {
    const [{position, max, clientSize, scrollSize}, dispatch] = useReducer(
        scrollbarReducer,
        initialState
    );

    const resize = useCallback(
        (clientSize: number, scrollSize: number) =>
            dispatch({type: 'resize', clientSize, scrollSize}),
        []
    );

    const scrollTo = useCallback((position: number) => dispatch({type: 'scrollTo', position}), []);
    const scrollBy = useCallback((amount: number) => dispatch({type: 'scrollBy', amount}), []);

    return {
        position,
        max,
        clientSize,
        scrollSize,
        scrollTo,
        scrollBy,
        resize,
    };
}
