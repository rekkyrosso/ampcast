import {clamp} from 'utils';

export interface ScrollbarState {
    position: number;
    max: number;
    clientSize: number;
    scrollSize: number;
}

export type ScrollbarAction =
    | {type: 'resize'; clientSize: number; scrollSize: number}
    | {type: 'scrollBy'; amount: number}
    | {type: 'scrollTo'; position: number};

export default function scrollbarReducer(
    state: ScrollbarState,
    action: ScrollbarAction
): ScrollbarState {
    switch (action.type) {
        case 'resize': {
            const clientSize = Math.max(action.clientSize, 0);
            const scrollSize = Math.max(action.scrollSize, clientSize);
            if (clientSize !== state.clientSize || scrollSize !== state.scrollSize) {
                const max = scrollSize - clientSize;
                const position = clamp(0, state.position, max);
                return {...state, position, max, clientSize, scrollSize};
            }
            return state;
        }

        case 'scrollBy': {
            const position = clamp(0, state.position + action.amount, state.max);
            if (position !== state.position) {
                return {...state, position};
            }
            return state;
        }

        case 'scrollTo': {
            const position = clamp(0, action.position, state.max);
            if (position !== state.position) {
                return {...state, position};
            }
            return state;
        }

        default:
            return state;
    }
}
