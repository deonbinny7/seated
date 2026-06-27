import type { City, Movie } from '@seated/core';

/** Cities, with the neighbourhoods cinemas are placed in and the languages films run in. */
export const CITIES: (City & { areas: string[]; priceFactor: number })[] = [
  { slug: 'mumbai', name: 'Mumbai', languages: ['Hindi', 'English', 'Marathi'], priceFactor: 1.25, areas: ['Andheri West', 'Lower Parel', 'Bandra', 'Powai', 'Ghatkopar', 'Borivali', 'Thane', 'Vashi', 'Malad', 'Kurla'] },
  { slug: 'delhi-ncr', name: 'Delhi-NCR', languages: ['Hindi', 'English', 'Punjabi'], priceFactor: 1.2, areas: ['Saket', 'Connaught Place', 'Vasant Kunj', 'Noida Sector 18', 'Gurugram Cyber City', 'Rohini', 'Dwarka', 'Rajouri Garden', 'Ghaziabad', 'Nehru Place'] },
  { slug: 'bengaluru', name: 'Bengaluru', languages: ['Kannada', 'English', 'Hindi', 'Tamil', 'Telugu'], priceFactor: 1.15, areas: ['Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'Malleshwaram', 'Yeshwanthpur', 'Electronic City', 'Hebbal', 'JP Nagar', 'Rajajinagar'] },
  { slug: 'hyderabad', name: 'Hyderabad', languages: ['Telugu', 'Hindi', 'English'], priceFactor: 1.0, areas: ['Gachibowli', 'Banjara Hills', 'Kukatpally', 'Ameerpet', 'Secunderabad', 'Madhapur', 'Dilsukhnagar', 'Kondapur', 'Uppal'] },
  { slug: 'chennai', name: 'Chennai', languages: ['Tamil', 'English', 'Hindi', 'Telugu'], priceFactor: 0.85, areas: ['Velachery', 'Anna Nagar', 'T. Nagar', 'Royapettah', 'OMR', 'Vadapalani', 'Koyambedu', 'Adyar', 'Tambaram', 'Porur'] },
  { slug: 'pune', name: 'Pune', languages: ['Marathi', 'Hindi', 'English'], priceFactor: 1.0, areas: ['Koregaon Park', 'Hinjewadi', 'Kothrud', 'Viman Nagar', 'Hadapsar', 'Aundh', 'Pimpri', 'Camp'] },
  { slug: 'kolkata', name: 'Kolkata', languages: ['Bengali', 'Hindi', 'English'], priceFactor: 0.9, areas: ['Salt Lake', 'Park Street', 'New Town', 'Howrah', 'Ballygunge', 'Behala', 'Dum Dum', 'Gariahat'] },
  { slug: 'ahmedabad', name: 'Ahmedabad', languages: ['Gujarati', 'Hindi', 'English'], priceFactor: 0.9, areas: ['Satellite', 'SG Highway', 'Navrangpura', 'Maninagar', 'Bopal', 'Vastrapur', 'Gota'] },
  { slug: 'kochi', name: 'Kochi', languages: ['Malayalam', 'English', 'Tamil', 'Hindi'], priceFactor: 0.85, areas: ['Edappally', 'MG Road', 'Kakkanad', 'Vyttila', 'Aluva', 'Fort Kochi', 'Thrippunithura'] },
  { slug: 'chandigarh', name: 'Chandigarh', languages: ['Punjabi', 'Hindi', 'English'], priceFactor: 0.95, areas: ['Sector 17', 'Industrial Area', 'Mohali', 'Panchkula', 'Zirakpur', 'Manimajra'] },
];

/**
 * Cinema chains. The names are invented: availability in demo mode is
 * generated, and attaching made-up seat data to real cinemas would misstate them.
 * `premium` raises prices and the odds of large-format and recliner halls.
 */
export const CHAINS = [
  { name: 'Aurora Cinemas', short: 'AU', premium: 0.8 },
  { name: 'Meridian Multiplex', short: 'MR', premium: 0.6 },
  { name: 'Lumen Pictures', short: 'LM', premium: 0.9 },
  { name: 'Orbit Cineplex', short: 'OR', premium: 0.4 },
  { name: 'Silverline Screens', short: 'SL', premium: 0.5 },
  { name: 'Galaxy Talkies', short: 'GX', premium: 0.1 },
  { name: 'Regal Picture House', short: 'RG', premium: 0.2 },
] as const;

type Seed = Omit<Movie, 'likes'>;

/** Demo catalogue. Titles are invented; posters are drawn from the palette. */
const CATALOG: Seed[] = [
  { id: 'the-last-monsoon', title: 'The Last Monsoon', tagline: 'Some storms you wait a lifetime for.', genres: ['Drama', 'Romance'], languages: ['Hindi', 'Tamil', 'Telugu'], runtimeMin: 148, cert: 'UA13+', popularity: 0.92, palette: ['#0f3d5c', '#1c7a8c', '#f2b35d'] },
  { id: 'vajra-rise-of-the-guardian', title: 'Vajra: Rise of the Guardian', tagline: 'A legend forged in thunder.', genres: ['Action', 'Fantasy'], languages: ['Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam'], runtimeMin: 172, cert: 'UA16+', popularity: 0.98, palette: ['#3a0d0d', '#b3261e', '#ffb400'] },
  { id: 'orbit-zero', title: 'Orbit Zero', tagline: 'Four hundred kilometres up. One way home.', genres: ['Sci-Fi', 'Thriller'], languages: ['English', 'Hindi'], runtimeMin: 127, cert: 'UA13+', popularity: 0.85, palette: ['#050b1f', '#243b8a', '#7fd4ff'] },
  { id: 'kaapi-and-chaos', title: 'Kaapi & Chaos', tagline: 'One wedding. Two families. Zero filter.', genres: ['Comedy', 'Family'], languages: ['Tamil', 'Malayalam'], runtimeMin: 134, cert: 'U', popularity: 0.74, palette: ['#5a2a0c', '#d9822b', '#ffe3b0'] },
  { id: 'midnight-local', title: 'Midnight Local', tagline: 'The 11:52 never reached Churchgate.', genres: ['Thriller', 'Mystery'], languages: ['Hindi', 'Marathi'], runtimeMin: 119, cert: 'UA16+', popularity: 0.7, palette: ['#0b1512', '#1f5c4a', '#e8f25a'] },
  { id: 'paper-boats', title: 'Paper Boats', tagline: 'Every river remembers.', genres: ['Drama'], languages: ['Bengali', 'Hindi'], runtimeMin: 126, cert: 'U', popularity: 0.52, palette: ['#23304a', '#6f8fb8', '#f4e9d8'] },
  { id: 'gully-grandmaster', title: 'Gully Grandmaster', tagline: 'Sixty-four squares. One way out.', genres: ['Sport', 'Drama'], languages: ['Hindi', 'Tamil', 'Telugu'], runtimeMin: 141, cert: 'U', popularity: 0.8, palette: ['#161616', '#5b5b5b', '#f5c518'] },
  { id: 'the-lighthouse-keepers-daughter', title: "The Lighthouse Keeper's Daughter", tagline: 'The sea keeps what it takes.', genres: ['Mystery', 'Drama'], languages: ['Malayalam', 'English'], runtimeMin: 131, cert: 'UA13+', popularity: 0.6, palette: ['#0c2230', '#3f7f8f', '#f0d9a0'] },
  { id: 'robo-chacha', title: 'Robo Chacha', tagline: 'He fixes everything. Except himself.', genres: ['Animation', 'Family', 'Comedy'], languages: ['Hindi', 'English', 'Tamil', 'Telugu'], runtimeMin: 102, cert: 'U', popularity: 0.78, palette: ['#ff6b35', '#ffd23f', '#2ec4b6'] },
  { id: 'rangrez', title: 'Rangrez', tagline: 'Love, in every colour it comes.', genres: ['Romance', 'Musical'], languages: ['Punjabi', 'Hindi'], runtimeMin: 138, cert: 'UA13+', popularity: 0.66, palette: ['#7a1f5c', '#e0457b', '#ffd6a5'] },
  { id: 'kantha-the-forest-oath', title: 'Kantha: The Forest Oath', tagline: 'The forest does not forgive.', genres: ['Action', 'Thriller'], languages: ['Kannada', 'Telugu', 'Tamil', 'Hindi'], runtimeMin: 156, cert: 'UA16+', popularity: 0.88, palette: ['#0f2412', '#3b7a3e', '#d9c26a'] },
  { id: 'the-quiet-hours', title: 'The Quiet Hours', tagline: 'Listen closely.', genres: ['Horror'], languages: ['English', 'Hindi'], runtimeMin: 104, cert: 'A', popularity: 0.58, palette: ['#0a0a0f', '#3c2a4d', '#c9b8e8'] },
  { id: 'saat-samundar', title: 'Saat Samundar', tagline: 'Seven seas. One promise.', genres: ['Adventure', 'Action'], languages: ['Hindi', 'Gujarati', 'Marathi'], runtimeMin: 151, cert: 'UA13+', popularity: 0.83, palette: ['#04364a', '#0f8b8d', '#ec9a29'] },
  { id: 'thalaivar-returns', title: 'Thalaivar Returns', tagline: 'Old city. Older scores.', genres: ['Action', 'Drama'], languages: ['Tamil', 'Telugu', 'Hindi'], runtimeMin: 164, cert: 'UA16+', popularity: 0.95, palette: ['#1a0f0a', '#8c3b12', '#ffcf70'] },
  { id: 'chai-pe-charcha', title: 'Chai Pe Charcha', tagline: 'Small town. Big opinions.', genres: ['Comedy', 'Drama'], languages: ['Hindi', 'Gujarati'], runtimeMin: 122, cert: 'U', popularity: 0.55, palette: ['#3d2b1f', '#a8763e', '#f3e5c3'] },
  { id: 'nila', title: 'Nila', tagline: 'She sang the moon down.', genres: ['Musical', 'Drama'], languages: ['Malayalam', 'Tamil'], runtimeMin: 129, cert: 'U', popularity: 0.63, palette: ['#101b3a', '#4257b2', '#e6e9ff'] },
];

export const DEMO_MOVIES: Movie[] = CATALOG.map((m) => ({
  ...m,
  likes: Math.round(m.popularity ** 3 * 640) * 1000,
}));
