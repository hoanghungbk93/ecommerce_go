import React, { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { googleLogin } from '../../store/slices/authSlice';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            type?: 'standard' | 'icon';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            logo_alignment?: 'left' | 'center';
            width?: string | number;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess, onError, disabled = false }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      const result = await dispatch(googleLogin({ id_token: response.credential }));
      
      if (googleLogin.fulfilled.match(result)) {
        onSuccess?.();
      } else {
        const errorMessage = result.payload as string || 'Google login failed';
        onError?.(errorMessage);
      }
    } catch (error: any) {
      onError?.(error.message || 'Google login failed');
    }
  }, [dispatch, onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not found. Please set REACT_APP_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    const initializeGoogleSignIn = () => {
      if (window.google && googleButtonRef.current && !isInitializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: '100%',
        });

        isInitializedRef.current = true;
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [GOOGLE_CLIENT_ID, handleCredentialResponse]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{
        padding: '0.75rem',
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '4px',
        color: '#92400e',
        fontSize: '0.875rem'
      }}>
        Google Client ID not configured. Please set REACT_APP_GOOGLE_CLIENT_ID environment variable.
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      opacity: disabled || isLoading ? 0.6 : 1,
      pointerEvents: disabled || isLoading ? 'none' : 'auto',
      position: 'relative'
    }}>
      <div ref={googleButtonRef} style={{ width: '100%' }} />
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '0.5rem',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          Signing in...
        </div>
      )}
    </div>
  );
};

export default GoogleLogin;
