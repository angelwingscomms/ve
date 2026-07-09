export interface Ve {
	s: 'e'       // tenant: ve
	i: string    // ve id
	u: string    // user id (owner)
	p: string    // prompt
	m: string    // model id (from OpenRouter)
	g?: number   // video duration in seconds
	z?: string   // resolution
	r: number    // period (ms between generates, 0 = sample)
	t: number    // retries count
	c?: string   // status: 'sampling' | 'active' | 'done' | 'failed'
	l?: number   // last_run timestamp (epoch ms)
	j?: string   // OpenRouter job id (for samples being polled)
	w?: string   // video url (for completed samples)
	n?: string   // current workflow instance id (for termination on delete)
	y?: number   // youtube upload enabled: 1
	ys?: string  // youtube upload status: 'pending' | 'uploading' | 'live' | 'yt_failed'
	yv?: string  // youtube video id
	d: number    // created timestamp
}
