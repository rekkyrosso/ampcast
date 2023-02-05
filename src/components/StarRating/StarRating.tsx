import React, {useState} from 'react';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
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
        <IconButtons className="star-rating">
            <IconButton
                icon="star"
                className={`${rating > 0 ? 'checked' : ''} ${firstStarClicked ? 'clicked' : ''}`}
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
            <IconButton
                icon="star"
                className={rating > 1 ? 'checked' : ''}
                onClick={() => (rating === 2 ? onClick(2) : onClick(4))}
            />
            <IconButton
                icon="star"
                className={rating > 2 ? 'checked' : ''}
                onClick={() => (rating === 3 ? onClick(4) : onClick(6))}
            />
            <IconButton
                icon="star"
                className={rating > 3 ? 'checked' : ''}
                onClick={() => (rating === 4 ? onClick(6) : onClick(8))}
            />
            <IconButton
                icon="star"
                className={rating > 4 ? 'checked' : ''}
                onClick={() => (rating === 5 ? onClick(8) : onClick(10))}
            />
        </IconButtons>
    );
}
