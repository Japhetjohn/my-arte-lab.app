import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import PrivyAuth from './PrivyAuth';

const App = () => {
  return (
    <PrivyProvider
      appId="cmj1xxpri04gnlg0di6i63k8w"
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#6366f1',
          logo: '/logo.PNG'
        },
        loginMethods: ['google', 'email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false
        }
      }}
    >
      <PrivyAuth />
    </PrivyProvider>
  );
};

ReactDOM.createRoot(document.getElementById('privy-root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
