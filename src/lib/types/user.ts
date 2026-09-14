export interface User {
	s: 'u'; // tenant: user
	n: string; // display name (from Google)
	p?: string; // picture URL
	m?: string; // email
	a?: {
		// api keys
		o?: string; // openrouter
		i?: string; // instagram
		x?: string; // x/twitter
		y?: string; // youtube (legacy google oauth json)
		t?: string; // tiktok
		b?: string; // buffer api key
		c?: string; // buffer youtube channel id
	};
	d: number; // date joined (epoch ms)
}
