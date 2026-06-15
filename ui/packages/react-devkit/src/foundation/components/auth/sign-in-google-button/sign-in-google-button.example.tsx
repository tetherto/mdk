/**
 * Runnable example for SignInGoogleButton.
 *
 * Triggers a full-page redirect to the OAuth backend. In a real app you'd
 * read `oauthBaseUrl` from `import.meta.env.VITE_OAUTH_BASE_URL`.
 */
import { SignInGoogleButton } from '@tetherto/mdk-react-devkit'

export const SignInGoogleButtonExample = () => (
  <SignInGoogleButton oauthBaseUrl="http://localhost:3000" />
)
