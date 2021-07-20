import React, {forwardRef, useCallback} from 'react';

export type InputProps = JSX.IntrinsicElements['input'];

function Input({onKeyDown, ...props}: InputProps, ref: React.ForwardedRef<HTMLInputElement>) {
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === ' ') {
                event.stopPropagation();
            }
            onKeyDown?.(event);
        },
        [onKeyDown]
    );

    return <input {...props} onKeyDown={handleKeyDown} ref={ref} />;
}

export default forwardRef(Input);
