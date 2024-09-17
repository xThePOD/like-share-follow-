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
  const castHash = '0x3ba6f52a'; // Replace with actual cast hash
  const yourFid = '14871';        // Replace with your FID

  // If required parameters are missing, return an error response
  if (!fid || !signature) {
    return Response.error(); // Simple error response
  }

  try {
    // Fetch the cast reactions from Neynar API
    const neynarResponse = await axios.get(`${API_BASE_URL}/cast/${castHash}/reactions`, {
      headers: {
        api_key: NEYNAR_API_KEY,
      },
    });

    const reactions = neynarResponse.data;

    // Check if the user has recasted and liked the cast
    const hasRecasted = reactions.recasts.some(
      (recast: { fid: string }) => recast.fid === fid
    );
    const hasLiked = reactions.likes.some(
      (like: { fid: string }) => like.fid === fid
    );

    // If either condition isn't met, return a simple error response
    if (!hasRecasted || !hasLiked) {
      return Response.error(); // Simple error response
    }

    // Check if the user is following you
    const isFollowing = await checkIfFollowing(fid, yourFid);

    if (isFollowing) {
      return c.res({
        title: 'Welcome',
        image: (
          <div
            style={{
              alignItems: 'center',
              background: 'linear-gradient(to right, #432889, #17101F)',
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
              Welcome to the Pod!
            </div>
          </div>
        ),
      });
    } else {
      return Response.error(); // Simple error response if the user is not following
    }
  } catch (error) {
    console.error('Verification error:', error);
    return Response.error(); // Return error for fetch or processing errors
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
