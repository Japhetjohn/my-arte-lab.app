import React, { useEffect, useRef } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';

const PrivyAuth = () => {
  const { ready, authenticated, user, logout, getAccessToken } = usePrivy();
  const isAuthenticating = useRef(false);

  const { login } = useLogin({
    onComplete: async (user, isNewUser) => {
      // Prevent duplicate auth requests
      if (isAuthenticating.current) {
        console.log('⚠️ Already authenticating, skipping duplicate request');
        return;
      }
      isAuthenticating.current = true;

      console.log('Privy login complete');

      // Get Privy access token
      const privyToken = await getAccessToken();

      // Get signup role if exists
      const signupRole = sessionStorage.getItem('signupRole') || 'client';
      sessionStorage.removeItem('signupRole');

      // Extract email from linked accounts (Privy stores OAuth data here)
      const googleAccount = user.linkedAccounts?.find(account => account.type === 'google_oauth');
      const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');

      // Try multiple locations for email extraction
      const userEmail = googleAccount?.email ||
                        emailAccount?.address ||
                        user.email?.address ||
                        user.google?.email ||
                        user.email;

      const userName = googleAccount?.name ||
                       user.google?.name ||
                       user.name ||
                       userEmail?.split('@')[0] ||
                       'User';

      // Validate that we have required data before proceeding
      if (!userEmail) {
        console.error('❌ Cannot authenticate: No email found in Privy user object');
        isAuthenticating.current = false;
        return;
      }

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
              email: userEmail,
              name: userName,
              googleId: googleAccount?.subject || user.google?.subject,
              profilePicture: googleAccount?.picture || user.google?.picture,
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
      } finally {
        // Reset authentication flag after completion
        setTimeout(() => {
          isAuthenticating.current = false;
        }, 1000);
      }
    },
    onError: (error) => {
      console.error('Privy login error:', error);
      isAuthenticating.current = false;
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
      // Prevent duplicate auth requests
      if (isAuthenticating.current) {
        return;
      }

      // Extract email from linked accounts (Privy stores OAuth data here)
      const googleAccount = user.linkedAccounts?.find(account => account.type === 'google_oauth');
      const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');

      // Try multiple locations for email extraction
      const userEmail = googleAccount?.email ||
                        emailAccount?.address ||
                        user.email?.address ||
                        user.google?.email ||
                        user.email;

      // Only sync with backend if we have a valid email
      if (!userEmail) {
        console.debug('Skipping auto-login: No email available yet');
        return;
      }

      // User is already logged in, sync with backend
      (async () => {
        isAuthenticating.current = true;
        try {
          const privyToken = await getAccessToken();

          const userName = googleAccount?.name ||
                           user.google?.name ||
                           user.name ||
                           userEmail?.split('@')[0] ||
                           'User';

          const response = await fetch('/api/auth/privy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              privyToken,
              user: {
                email: userEmail,
                name: userName,
                googleId: googleAccount?.subject || user.google?.subject,
                profilePicture: googleAccount?.picture || user.google?.picture
              },
              isNewUser: false
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
        } finally {
          // Reset authentication flag
          setTimeout(() => {
            isAuthenticating.current = false;
          }, 1000);
        }
      })();
    }
  }, [ready, authenticated, user, getAccessToken]);

  return null; // This component doesn't render anything
};

export default PrivyAuth;
