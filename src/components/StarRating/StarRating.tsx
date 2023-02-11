import React, {useState} from 'react';
import {Except} from 'type-fest';
import IconButton, {IconButtonProps} from 'components/Button/IconButton';
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
            <Star
                checked={rating > 0}
                className={firstStarClicked ? 'clicked' : ''}
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
            <Star checked={rating > 1} onClick={() => (rating === 2 ? onClick(2) : onClick(4))} />
            <Star checked={rating > 2} onClick={() => (rating === 3 ? onClick(4) : onClick(6))} />
            <Star checked={rating > 3} onClick={() => (rating === 4 ? onClick(6) : onClick(8))} />
            <Star checked={rating > 4} onClick={() => (rating === 5 ? onClick(8) : onClick(10))} />
        </IconButtons>
    );
}

interface StarProps extends Except<IconButtonProps, 'icon'> {
    checked?: boolean;
}

function Star({checked, className = '', ...props}: StarProps) {
    return (
        <IconButton
            {...props}
            icon="star"
            className={`${checked ? 'checked' : ''} ${className}`}
            tabIndex={-1}
        />
    );
}
