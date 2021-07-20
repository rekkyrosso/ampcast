import React, {forwardRef, useCallback} from 'react';

export type ButtonProps = JSX.IntrinsicElements['button'];

function Button({onKeyDown, ...props}: ButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) {
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === ' ') {
                event.stopPropagation();
            }
            onKeyDown?.(event);
        },
        [onKeyDown]
    );

    return <button {...props} onKeyDown={handleKeyDown} ref={ref} />;
}

export default forwardRef(Button);
