import React, {useCallback, useState} from 'react';
import {cancelEvent, stopPropagation} from 'utils';
import './StarRating.scss';

export interface StarRatingProps {
    value?: number; // 0 - 5
    tabIndex?: number;
    onChange?: (value: number) => void;
}

export default function StarRating({value = 0, tabIndex = 0, onChange}: StarRatingProps) {
    const [selectedIndex, setSelectedIndex] = useState(() => Math.max(value - 1, 0));
    const [hoverIndex, setHoverIndex] = useState(-1);
    const [firstStarClicked, setFirstStarClicked] = useState(false);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowLeft':
                    if (selectedIndex === 0 && value === 1) {
                        onChange?.(0);
                    } else if (selectedIndex > 0) {
                        const index = selectedIndex - 1;
                        setSelectedIndex(index);
                        onChange?.(index + 1);
                    }
                    break;

                case 'ArrowRight':
                    if (selectedIndex === 0 && value === 0) {
                        onChange?.(1);
                    } else if (selectedIndex < 4) {
                        const index = selectedIndex + 1;
                        setSelectedIndex(index);
                        onChange?.(index + 1);
                    }
                    break;
            }
        },
        [selectedIndex, value, onChange]
    );

    return (
        <div
            className="star-rating"
            tabIndex={tabIndex}
            onKeyDown={handleKeyDown}
            onMouseDown={cancelEvent}
            onMouseUp={stopPropagation}
            onMouseLeave={() => setHoverIndex(-1)}
        >
            <button
                className={`star-rating-button ${selectedIndex === 0 ? 'selected' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setSelectedIndex(0);
                    if (value === 1) {
                        setFirstStarClicked(true);
                        onChange?.(0);
                    } else {
                        onChange?.(1);
                    }
                }}
                onMouseEnter={() => {
                    setHoverIndex(0);
                    setFirstStarClicked(false);
                }}
            >
                {(hoverIndex === -1 && value > 0) ||
                (hoverIndex === 0 && !firstStarClicked) ||
                hoverIndex > 0
                    ? '★'
                    : '☆'}
            </button>
            <button
                className={`star-rating-button ${selectedIndex === 1 ? 'selected' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setSelectedIndex(1);
                    if (value === 2) {
                        onChange?.(1);
                    } else {
                        onChange?.(2);
                    }
                }}
                onMouseEnter={() => setHoverIndex(1)}
            >
                {(hoverIndex === -1 && value > 1) || hoverIndex >= 1 ? '★' : '☆'}
            </button>
            <button
                className={`star-rating-button ${selectedIndex === 2 ? 'selected' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setSelectedIndex(2);
                    if (value === 3) {
                        onChange?.(2);
                    } else {
                        onChange?.(3);
                    }
                }}
                onMouseEnter={() => setHoverIndex(2)}
            >
                {(hoverIndex === -1 && value > 2) || hoverIndex >= 2 ? '★' : '☆'}
            </button>
            <button
                className={`star-rating-button ${selectedIndex === 3 ? 'selected' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setSelectedIndex(3);
                    if (value === 4) {
                        onChange?.(3);
                    } else {
                        onChange?.(4);
                    }
                }}
                onMouseEnter={() => setHoverIndex(3)}
            >
                {(hoverIndex === -1 && value > 3) || hoverIndex >= 3 ? '★' : '☆'}
            </button>
            <button
                className={`star-rating-button ${selectedIndex === 4 ? 'selected' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setSelectedIndex(4);
                    if (value === 5) {
                        onChange?.(4);
                    } else {
                        onChange?.(5);
                    }
                }}
                onMouseEnter={() => setHoverIndex(4)}
            >
                {(hoverIndex === -1 && value > 4) || hoverIndex === 4 ? '★' : '☆'}
            </button>
        </div>
    );
}
