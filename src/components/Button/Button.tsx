import React from 'react';
import './Button.scss';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
    React.RefAttributes<HTMLButtonElement>;

export default function Button({className = '', ...props}: ButtonProps) {
    return <button {...props} className={`button ${className}`} />;
}
