import React from 'react';
import {LoginProps} from './Login';

export default function SecureContextRequired({service}: LoginProps) {
    return (
        <div className="note">
            <p>
                A <em>secure context</em> is required for {service.name} login.
            </p>
            <p>
                Your {__app_name__} application needs to be hosted on a <code>localhost</code> or{' '}
                <code>https:</code> domain.
            </p>
        </div>
    );
}
