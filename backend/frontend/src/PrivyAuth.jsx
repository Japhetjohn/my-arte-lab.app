import React, { useEffect } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';

const PrivyAuth = () => {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const { login } = useLogin({
    onComplete: async (user, isNewUser) => {
      console.log('Privy login complete:', { user, isNewUser });
      
      // Get Privy access token
      const privyToken = await getAccessToken();
      
      // Get signup role if exists
      const signupRole = sessionStorage.getItem('signupRole') || 'client';
      sessionStorage.removeItem('signupRole');

      // Send to backend to create/login user
      try {
        const response = await fetch('/api/auth/privy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            privyToken,
            user: {
              email: user.email?.address,
              name: user.google?.name || user.email?.address?.split('@')[0],
              googleId: user.google?.subject,
              profilePicture: user.google?.picture,
              role: signupRole
            },
            isNewUser
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Store JWT token
          localStorage.setItem('token', data.data.token);
          
          // Trigger custom event for vanilla JS app
          window.dispatchEvent(new CustomEvent('privy-login-success', {
            detail: { user: data.data.user, token: data.data.token }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('privy-login-error', {
            detail: { error: data.message }
          }));
        }
      } catch (error) {
        console.error('Backend auth error:', error);
        window.dispatchEvent(new CustomEvent('privy-login-error', {
          detail: { error: error.message }
        }));
      }
    },
    onError: (error) => {
      console.error('Privy login error:', error);
      window.dispatchEvent(new CustomEvent('privy-login-error', {
        detail: { error: error.message }
      }));
    }
  });

  // Expose Privy functions to window object for vanilla JS
  useEffect(() => {
    if (ready) {
      window.privyAuth = {
        login,
        logout: async () => {
          await logout();
          localStorage.removeItem('token');
          window.dispatchEvent(new CustomEvent('privy-logout'));
        },
        authenticated,
        user,
        getAccessToken
      };
      
      // Trigger ready event
      window.dispatchEvent(new Event('privy-ready'));
    }
  }, [ready, authenticated, user, login, logout, getAccessToken]);

  // Auto-check if user is already authenticated
  useEffect(() => {
    if (ready && authenticated && user) {
      // User is already logged in, sync with backend
      (async () => {
        try {
          const privyToken = await getAccessToken();
          const response = await fetch('/api/auth/privy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              privyToken,
              user: {
                email: user.email?.address,
                name: user.google?.name || user.email?.address?.split('@')[0],
                googleId: user.google?.subject,
                profilePicture: user.google?.picture
              }
            })
          });
          
          const data = await response.json();
          if (data.success) {
            localStorage.setItem('token', data.data.token);
            window.dispatchEvent(new CustomEvent('privy-auto-login', {
              detail: { user: data.data.user, token: data.data.token }
            }));
          }
        } catch (error) {
          console.error('Auto-login error:', error);
        }
      })();
    }
  }, [ready, authenticated, user, getAccessToken]);

  return null; // This component doesn't render anything
};

export default PrivyAuth;
