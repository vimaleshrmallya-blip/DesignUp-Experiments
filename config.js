// Paste your Supabase project values here (Project Settings → API). The anon key is meant to be public.
// Leave the placeholders to run in private demo mode (everything stays in the visitor's browser).
// providers: sign-in buttons to show. "google" is the default; add "linkedin_oidc" once it's set up in Supabase.
// music (optional): a ♪ button opens a player. Use a SoundCloud, Spotify or YouTube link, or a pasted <iframe> snippet.
//   Remove the whole music line to hide the button.
window.DU_CONFIG = {
  url: "YOUR_SUPABASE_URL",
  key: "YOUR_SUPABASE_ANON_KEY",
  providers: ["google"],
  music: { title: "Drumming session", url: "https://youtu.be/fRcNFEIUSQU?si=X9etQslQAE_-qZhD&t=246" }
};
