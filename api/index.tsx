import { Button, Frog } from 'frog';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { handle } from 'frog/vercel';
import axios from 'axios';  // Make sure axios is installed with types

// Define the FrameContext type
type FrameContext = {
  buttonValue?: string;
  trustedData?: {
    fid: string;
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
        <div style={{ alignItems: 'center', background: 'black', display: 'flex', height: '100%', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
          <div style={{ color: 'white', fontSize: 60, marginTop: 30, padding: '0 120px', whiteSpace: 'pre-wrap' }}>
            Press Enter to Proceed
          </div>
        </div>
      ),
      intents: [<Button value="enter">Enter</Button>],
    });
  }
  if (c.buttonValue === 'enter') {
    return handleVerification(c);
  }
  return c.res({
    title: 'Error',
    image: <div>Error: Invalid State</div>,
  });
});

async function handleVerification(c: FrameContext) {
  const fid = c?.trustedData?.fid;  // User's FID from the Farcaster context
  const castHash = '0x3ba6f52a'; // Replace with the actual cast hash
  const yourFid = '14871';        // Replace with your FID

  if (!fid) {
    return c.res({
      title: 'Error',
      image: <div style={{ color: 'red' }}>Error: User not authenticated!</div>,
      intents: [<Button.Reset>Retry</Button.Reset>],
    });
  }

  try {
    // Fetch the cast reactions from Neynar API
    const neynarResponse = await fetch(`${API_BASE_URL}/cast/${castHash}`, {
      headers: {
        api_key: NEYNAR_API_KEY,
      },
    });
    const data = await neynarResponse.json();
    const reactions = data.cast.reactions;

    // Check if user has recasted and liked the cast
    const hasRecasted = reactions.recasts.some(
      (recast: { fid: string }) => recast.fid === fid  // Corrected comparison: string to string
    );
    const hasLiked = reactions.likes.some(
      (like: { fid: string }) => like.fid === fid  // Corrected comparison: string to string
    );

    if (!hasRecasted || !hasLiked) {
      // If the user hasn't recasted or liked, show error and retry option
      return c.res({
        title: 'Error',
        image: (
          <div style={{ alignItems: 'center', background: 'red', display: 'flex', height: '100%', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <div style={{ color: 'white', fontSize: 60, marginTop: 30, padding: '0 120px', whiteSpace: 'pre-wrap' }}>
              Error: You must like and recast the cast first!
            </div>
          </div>
        ),
        intents: [<Button.Reset>Retry</Button.Reset>],
      });
    }

    // Check if the user is following you
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
        title: 'Error',
        image: (
          <div style={{ alignItems: 'center', background: 'red', display: 'flex', height: '100%', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <div style={{ color: 'white', fontSize: 60, marginTop: 30, padding: '0 120px', whiteSpace: 'pre-wrap' }}>
              Error: You must follow me first!
            </div>
          </div>
        ),
        intents: [<Button.Reset>Retry</Button.Reset>],
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return c.res({
      title: 'Error',
      image: <div style={{ color: 'red' }}>Error: Verification failed. Please try again later.</div>,
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

const isProduction = process.env.NODE_ENV === 'production';
devtools(app, isProduction ? { assetsPath: '/.frog' } : { serveStatic });

export const GET = handle(app);
export const POST = handle(app);
