export interface SplitterState {
    primaryMinSize: number;
    secondaryMinSize: number;
    secondaryPaneSize: number;
    splitterSize: number;
    containerSize: number;
}

export type SplitterAction =
    | {type: 'setContainerSize'; containerSize: number}
    | {type: 'setSecondaryPaneSize'; secondaryPaneSize: number}
    | {type: 'setMinSizes'; primaryMinSize: number; secondaryMinSize: number; splitterSize: number};

export default function SplitterReducer(
    state: SplitterState,
    action: SplitterAction
): SplitterState {
    switch (action.type) {
        case 'setContainerSize': {
            const containerSize = Math.max(action.containerSize, 0);
            if (containerSize !== state.containerSize) {
                const {primaryMinSize, secondaryMinSize, secondaryPaneSize, splitterSize} = state;
                return {
                    ...state,
                    containerSize,
                    secondaryPaneSize: calculateSecondaryPaneSize(
                        primaryMinSize,
                        secondaryMinSize,
                        secondaryPaneSize,
                        splitterSize,
                        containerSize
                    ),
                };
            }
            return state;
        }

        case 'setSecondaryPaneSize': {
            const {primaryMinSize, secondaryMinSize, splitterSize, containerSize} = state;
            const secondaryPaneSize = calculateSecondaryPaneSize(
                primaryMinSize,
                secondaryMinSize,
                Math.max(action.secondaryPaneSize, 0),
                splitterSize,
                containerSize
            );
            if (secondaryPaneSize !== state.secondaryPaneSize) {
                return {
                    ...state,
                    secondaryPaneSize,
                };
            }
            return state;
        }

        case 'setMinSizes': {
            const primaryMinSize = Math.max(action.primaryMinSize, 0);
            const secondaryMinSize = Math.max(action.secondaryMinSize, 0);
            const splitterSize = Math.max(action.splitterSize, 0);
            if (
                primaryMinSize !== state.primaryMinSize ||
                secondaryMinSize !== state.secondaryMinSize ||
                splitterSize !== state.splitterSize
            ) {
                return {
                    ...state,
                    primaryMinSize,
                    secondaryMinSize,
                    splitterSize,
                    secondaryPaneSize: calculateSecondaryPaneSize(
                        primaryMinSize,
                        secondaryMinSize,
                        state.secondaryPaneSize,
                        splitterSize,
                        state.containerSize
                    ),
                };
            }
            return state;
        }

        default:
            return state;
    }
}

function calculateSecondaryPaneSize(
    primaryMinSize: number,
    secondaryMinSize: number,
    secondaryPaneSize: number,
    splitterSize: number,
    containerSize: number
): number {
    if (containerSize > 0) {
        const primaryPaneSize = containerSize - splitterSize - secondaryPaneSize;
        if (primaryPaneSize < primaryMinSize) {
            return Math.max(secondaryPaneSize - (primaryMinSize - primaryPaneSize), 0);
        } else if (secondaryPaneSize < secondaryMinSize) {
            return Math.min(containerSize - splitterSize - primaryMinSize, secondaryMinSize);
        }
    }
    return secondaryPaneSize;
}
