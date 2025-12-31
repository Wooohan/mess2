
import { FacebookPage } from '../types';

/**
 * STEP 1: Replace this string with your App ID from https://developers.facebook.com
 */
const FB_APP_ID = '1938499797069544'; 

let sdkPromise: Promise<void> | null = null;

export const isAppIdConfigured = () => {
  return FB_APP_ID !== 'YOUR_FB_APP_ID' && /^\d+$/.test(FB_APP_ID);
};

export const isSecureOrigin = () => {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

export const initFacebookSDK = (): Promise<void> => {
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve) => {
    if ((window as any).FB && (window as any).FB._initialized) {
      resolve();
      return;
    }

    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId            : isAppIdConfigured() ? FB_APP_ID : '123456789', // Use dummy only to prevent crash during init
        cookie           : true,
        xfbml            : true,
        version          : 'v22.0'
      });
      (window as any).FB._initialized = true;
      resolve();
    };

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
      return reject('Invalid App ID. Please update services/facebookService.ts with your Meta App ID.');
    }
    
    if (!isSecureOrigin()) {
      return reject('Facebook Login requires HTTPS. Meta forbids OAuth on insecure origins.');
    }

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse);
      } else {
        reject('Authorization failed. Did you grant permissions in the popup?');
      }
    }, { 
      // Comprehensive scopes for Page Messaging
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
          accessToken: p.access_token, // Real Page Token for sending messages
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
