import React, {useState} from 'react';
import {cancelEvent, stopPropagation} from 'utils';
import './StarRating.scss';

export interface StarRatingProps {
    rating?: number;
    onClick?: (rating: number) => void;
}

const noClick = () => undefined;

export default function StarRating({
    rating: initialRating = 0,
    onClick = noClick,
}: StarRatingProps) {
    const rating = Math.round(initialRating / 2);
    const [firstStarClicked, setFirstStarClicked] = useState(false);

    return (
        <div className="star-rating" onMouseDown={cancelEvent} onMouseUp={stopPropagation}>
            <button
                className={`star-rating-button ${rating > 0 ? 'checked' : ''} ${
                    firstStarClicked ? 'clicked' : ''
                }`}
                type="button"
                tabIndex={-1}
                onClick={() => {
                    setFirstStarClicked(true);
                    if (rating === 1) {
                        onClick(0);
                    } else {
                        onClick(2);
                    }
                }}
                onMouseLeave={() => setFirstStarClicked(false)}
            />
            <button
                className={`star-rating-button ${rating > 1 ? 'checked' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => (rating === 2 ? onClick(2) : onClick(4))}
            />
            <button
                className={`star-rating-button ${rating > 2 ? 'checked' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => (rating === 3 ? onClick(4) : onClick(6))}
            />
            <button
                className={`star-rating-button ${rating > 3 ? 'checked' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => (rating === 4 ? onClick(6) : onClick(8))}
            />
            <button
                className={`star-rating-button ${rating > 4 ? 'checked' : ''}`}
                type="button"
                tabIndex={-1}
                onClick={() => (rating === 5 ? onClick(8) : onClick(10))}
            />
        </div>
    );
}
