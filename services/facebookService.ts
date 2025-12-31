
import { FacebookPage } from '../types';

/**
 * Meta App ID provided by user: 1938499797069544
 */
const FB_APP_ID: string = '1938499797069544'; 

let sdkPromise: Promise<void> | null = null;

export const isAppIdConfigured = () => {
  return FB_APP_ID !== 'YOUR_FB_APP_ID' && /^\d+$/.test(FB_APP_ID);
};

export const isSecureOrigin = () => {
  // Meta strictly requires HTTPS for JSSDK Login unless on localhost
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

export const initFacebookSDK = (): Promise<void> => {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve) => {
    // Check if SDK already loaded and initialized
    if ((window as any).FB && (window as any).FB._initialized) {
      resolve();
      return;
    }

    (window as any).fbAsyncInit = function() {
      try {
        (window as any).FB.init({
          appId            : isAppIdConfigured() ? FB_APP_ID : '123456789',
          cookie           : true,   // Enable cookies to allow the server to access the session
          xfbml            : true,   // Parse social plugins on this webpage
          version          : 'v22.0', // Use the latest Graph API version
          status           : true    // Check login status on every page load
        });
        (window as any).FB._initialized = true;
        console.log("Facebook SDK Initialized Successfully");
        resolve();
      } catch (e) {
        console.error("FB.init failed:", e);
        resolve(); // Resolve anyway to prevent hanging, but log error
      }
    };

    // Inject SDK Script
    if (!document.getElementById('facebook-jssdk')) {
      const fjs = document.getElementsByTagName('script')[0];
      const js = document.createElement('script') as HTMLScriptElement;
      js.id = 'facebook-jssdk';
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    } else if ((window as any).FB) {
      (window as any).fbAsyncInit();
    }
  });

  return sdkPromise;
};

export const loginWithFacebook = async () => {
  await initFacebookSDK();

  return new Promise<any>((resolve, reject) => {
    if (!isAppIdConfigured()) {
      return reject('App ID is not configured. Please check services/facebookService.ts');
    }
    
    if (!isSecureOrigin()) {
      return reject('Meta requires HTTPS. Please ensure you are running on a secure domain.');
    }

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse);
      } else {
        // Handle cases where the JSSDK login is disabled in the dashboard
        const errorMsg = response?.error_message || 'Authorization failed. Check if "Login with JavaScript SDK" is enabled in your Meta App Dashboard.';
        reject(errorMsg);
      }
    }, { 
      // Permissions required for Page Messaging
      scope: 'pages_messaging,pages_show_list,pages_manage_metadata,public_profile,pages_read_engagement' 
    });
  });
};

export const fetchUserPages = async (): Promise<FacebookPage[]> => {
  await initFacebookSDK();
  
  return new Promise((resolve, reject) => {
    if (!(window as any).FB) return reject('Facebook SDK missing');

    (window as any).FB.api('/me/accounts', (response: any) => {
      if (response && !response.error) {
        const pages: FacebookPage[] = response.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'Business',
          isConnected: true,
          accessToken: p.access_token,
          assignedAgentIds: []
        }));
        resolve(pages);
      } else {
        reject(response?.error?.message || 'Failed to fetch authorized pages.');
      }
    });
  });
};

export const sendPageMessage = async (recipientId: string, text: string, pageAccessToken: string) => {
  const url = `https://graph.facebook.com/v22.0/me/messages?access_token=${pageAccessToken}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE"
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data;
};
