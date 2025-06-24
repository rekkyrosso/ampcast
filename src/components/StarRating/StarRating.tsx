import React, {useCallback, useRef, useState} from 'react';
import {cancelEvent, clamp, stopPropagation} from 'utils';
import './StarRating.scss';

export interface StarRatingProps {
    value?: number; // 0 - 5
    tabIndex?: number;
    increment?: 0.5 | 1;
    onChange?: (value: number) => void;
}

export default function StarRating({
    value = 0,
    tabIndex = 0,
    increment = 1,
    onChange,
}: StarRatingProps) {
    const buttonsRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(() => Math.max(Math.ceil(value) - 1, 0));
    const [hoverValue, setHoverValue] = useState(-1);
    const [ratingReset, setRatingReset] = useState(false);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            let newValue = value;
            switch (event.key) {
                case 'ArrowLeft': {
                    newValue -= increment;
                    break;
                }

                case 'ArrowRight': {
                    newValue += increment;
                }
            }
            newValue = clamp(0, newValue, 5);
            if (newValue !== value) {
                setSelectedIndex(Math.max(Math.ceil(newValue) - 1, 0));
                onChange?.(newValue);
            }
        },
        [value, increment, onChange]
    );

    return (
        <div className="star-rating" tabIndex={tabIndex}>
            <div
                className="star-rating-buttons"
                onKeyDown={handleKeyDown}
                onMouseDown={cancelEvent}
                onMouseUp={stopPropagation}
                onMouseMove={(event) => {
                    const rect = buttonsRef.current!.getBoundingClientRect();
                    const value = Math.ceil(((event.clientX - rect.left) / rect.width) * 10) / 2;
                    setHoverValue(clamp(0, increment === 1 ? Math.ceil(value) : value, 5));
                }}
                onMouseLeave={() => {
                    setRatingReset(false);
                    setHoverValue(-1);
                }}
                ref={buttonsRef}
            >
                {[0, 1, 2, 3, 4].map((index) => (
                    <Star
                        index={index}
                        value={ratingReset ? 0 : hoverValue === -1 ? value : hoverValue}
                        selected={index === selectedIndex}
                        onClick={(event) => {
                            if (event.button === 0) {
                                if (value === hoverValue && !ratingReset) {
                                    setSelectedIndex(0);
                                    setRatingReset(true);
                                    onChange?.(0);
                                } else {
                                    setSelectedIndex(index);
                                    setRatingReset(false);
                                    onChange?.(hoverValue);
                                }
                            }
                        }}
                        onMouseLeave={() => setRatingReset(false)}
                        key={index}
                    />
                ))}
            </div>
        </div>
    );
}

interface StarProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    index: number;
    value: number;
    selected: boolean;
}

function Star({index, value, selected, ...props}: StarProps) {
    const max = index + 1;
    return (
        <button
            {...props}
            className={`star-rating-button ${selected ? 'selected' : ''}`}
            type="button"
            tabIndex={-1}
        >
            {max - value === 0.5 ? (
                <span className="half-star">
                    <span className="half-star-bg">☆</span>
                    <span className="half-star-fg">★</span>
                </span>
            ) : value >= max ? (
                '★'
            ) : (
                '☆'
            )}
        </button>
    );
}
