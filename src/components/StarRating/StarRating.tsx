import React, {useCallback, useRef, useState} from 'react';
import {cancelEvent, clamp, stopPropagation} from 'utils';
import './StarRating.scss';

export interface StarRatingProps {
    value?: number; // 0 - 5
    readOnly?: boolean;
    tabIndex?: number;
    increment?: 0.5 | 1;
    onChange?: (value: number) => void;
}

export default function StarRating({
    value = 0,
    readOnly,
    tabIndex = 0,
    increment = 1,
    onChange,
}: StarRatingProps) {
    const buttonsRef = useRef<HTMLDivElement>(null);
    const [currentValue, setCurrentValue] = useState(value);
    const [hoverValue, setHoverValue] = useState(-1);
    const [ratingReset, setRatingReset] = useState(false);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            let newValue = value;
            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    newValue -= increment;
                    break;

                case 'ArrowRight':
                case 'ArrowUp':
                    newValue += increment;
                    break;

                case 'Home':
                    newValue = 0;
                    break;

                case 'End':
                    newValue = 5;
                    break;
            }
            newValue = clamp(0, newValue, 5);
            if (newValue !== value) {
                setCurrentValue(newValue);
                onChange?.(newValue);
            }
        },
        [value, increment, onChange]
    );

    return (
        <div
            className="star-rating"
            role="slider"
            aria-label="Rating"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={currentValue}
            onKeyDown={readOnly ? undefined : handleKeyDown}
            tabIndex={tabIndex}
        >
            <div
                className="star-rating-buttons"
                onMouseDown={cancelEvent}
                onMouseUp={stopPropagation}
                onMouseMove={
                    readOnly
                        ? undefined
                        : (event) => {
                              const rect = buttonsRef.current!.getBoundingClientRect();
                              const value =
                                  Math.ceil(((event.clientX - rect.left) / rect.width) * 10) / 2;
                              setHoverValue(
                                  clamp(0, increment === 1 ? Math.ceil(value) : value, 5)
                              );
                          }
                }
                onMouseLeave={
                    readOnly
                        ? undefined
                        : () => {
                              setRatingReset(false);
                              setHoverValue(-1);
                          }
                }
                ref={buttonsRef}
            >
                {[0, 1, 2, 3, 4].map((index) => (
                    <Star
                        index={index}
                        value={ratingReset ? 0 : hoverValue === -1 ? value : hoverValue}
                        onClick={
                            readOnly
                                ? undefined
                                : (event) => {
                                      if (event.button === 0) {
                                          if (value === hoverValue && !ratingReset) {
                                              setRatingReset(true);
                                              onChange?.(0);
                                          } else {
                                              setRatingReset(false);
                                              onChange?.(hoverValue);
                                          }
                                      }
                                  }
                        }
                        onMouseLeave={readOnly ? undefined : () => setRatingReset(false)}
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
}

function Star({index, value, ...props}: StarProps) {
    const max = index + 1;
    return (
        <button {...props} className="star-rating-button" type="button" tabIndex={-1}>
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
