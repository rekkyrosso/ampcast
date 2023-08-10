import {useCallback, useEffect, useMemo, useReducer} from 'react';
import layoutSettings from 'services/layoutSettings';
import splitterReducer, {SplitterState} from './splitterReducer';

const initialState: SplitterState = {
    primaryMinSize: 0,
    secondaryMinSize: 0,
    secondaryPaneSize: 0,
    splitterSize: 0,
    containerSize: 0,
};

export default function useSplitterState(id?: string) {
    const state = useMemo(
        () => ({
            ...initialState,
            secondaryPaneSize: id ? layoutSettings.get(id) : 0,
        }),
        [id]
    );
    const [{secondaryPaneSize}, dispatch] = useReducer(splitterReducer, state);

    useEffect(() => {
        if (id && secondaryPaneSize) {
            layoutSettings.set(id, secondaryPaneSize);
        }
    }, [id, secondaryPaneSize]);

    const setContainerSize = useCallback(
        (containerSize: number) => dispatch({type: 'setContainerSize', containerSize}),
        []
    );

    const setSecondaryPaneSize = useCallback(
        (secondaryPaneSize: number) => dispatch({type: 'setSecondaryPaneSize', secondaryPaneSize}),
        []
    );

    const setMinSizes = useCallback(
        (primaryMinSize: number, secondaryMinSize: number, splitterSize: number) =>
            dispatch({type: 'setMinSizes', primaryMinSize, secondaryMinSize, splitterSize}),
        []
    );

    return {
        secondaryPaneSize,
        setContainerSize,
        setSecondaryPaneSize,
        setMinSizes,
    };
}
