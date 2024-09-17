import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { handle } from 'frog/vercel';
import axios from 'axios';

// Define the FrameContext type, including signature for Farcaster verification
type FrameContext = {
  buttonValue?: string;
  trustedData?: {
    fid: string;
    signature: string;
  };
  res: (response: any) => any;
  status?: string;
};

const NEYNAR_API_KEY = '63FC33FA-82AF-466A-B548-B3D906ED2314'; // Replace with your actual Neynar API key
const API_BASE_URL = 'https://api.neynar.com/v2/farcaster';

export const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  title: 'Like, Recast, Follow Verification',
});

app.frame('/', (c: FrameContext) => {
  const { status } = c;

  if (status !== 'response') {
    return c.res({
      title: 'Initial Frame',
      image: (
        <div
          style={{
            alignItems: 'center',
            background: 'black',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 60,
              marginTop: 30,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
            }}
          >
            Press Enter to Proceed
          </div>
        </div>
      ),
      intents: [<Button value="enter">Enter</Button>],
    });
  }

  if (c.buttonValue === 'enter') {
    return handleVerification(c); // Handle verification on button click
  }

  return c.res({
    title: 'Error',
    image: <div>Error: Invalid State</div>,
  });
});

// Function to handle the verification process
async function handleVerification(c: FrameContext) {
  const fid = c?.trustedData?.fid;
  const signature = c?.trustedData?.signature;
  const castHash = '0x3ba6f52a79b872eca5536944532b4f71e1c25ec6'; // Replace with actual cast hash
  const yourFid = '14871';        // Replace with your FID

  console.log('trustedData:', c.trustedData);
  console.log('buttonValue:', c.buttonValue);

  if (!fid || !signature) {
    return c.res({
      title: 'Error',
      image: (
        <div style={{ background: 'red', color: 'white', fontSize: 40, padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Error: User not authenticated. Please try again.
        </div>
      ),
      intents: [<Button.Reset>Retry</Button.Reset>],
    });
  }

  try {
    const neynarResponse = await axios.get(`${API_BASE_URL}/cast/${castHash}/reactions`, {
      headers: {
        api_key: NEYNAR_API_KEY,
      },
    });

    const reactions = neynarResponse.data;

    const hasRecasted = reactions.recasts.some((recast: { fid: string }) => recast.fid === fid);
    const hasLiked = reactions.likes.some((like: { fid: string }) => like.fid === fid);

    if (!hasRecasted || !hasLiked) {
      return c.res({
        title: 'Action Required',
        image: (
          <div style={{ background: 'orange', color: 'black', fontSize: 40, padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Please like and recast the original post before proceeding.
          </div>
        ),
        intents: [<Button.Reset>Retry</Button.Reset>],
      });
    }

    const isFollowing = await checkIfFollowing(fid, yourFid);

    if (isFollowing) {
      return c.res({
        title: 'Welcome',
        image: (
          <div style={{ alignItems: 'center', background: 'linear-gradient(to right, #432889, #17101F)', display: 'flex', height: '100%', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <div style={{ color: 'white', fontSize: 60, marginTop: 30, padding: '0 120px', whiteSpace: 'pre-wrap' }}>
              Welcome to the Pod!
            </div>
          </div>
        ),
      });
    } else {
      return c.res({
        title: 'Action Required',
        image: (
          <div style={{ background: 'orange', color: 'black', fontSize: 40, padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Please follow the account before proceeding.
          </div>
        ),
        intents: [<Button.Reset>Retry</Button.Reset>],
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return c.res({
      title: 'Error',
      image: (
        <div style={{ background: 'red', color: 'white', fontSize: 40, padding: '20px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          An error occurred during verification. Please try again later.
        </div>
      ),
      intents: [<Button.Reset>Retry</Button.Reset>],
    });
  }
}

// Function to check if the user is following you
async function checkIfFollowing(fid: string, targetFid: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/user/${fid}/following`, {
      headers: { api_key: NEYNAR_API_KEY },
    });
    return response.data.users.some((user: { fid: string }) => user.fid === targetFid);
  } catch (error) {
    console.error('Error checking following status:', error);
    throw error;
  }
}

// Setup for development and production environments
const isProduction = process.env.NODE_ENV === 'production';
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);