export interface Ve {
	s: 'e'       // tenant: ve
	i: string    // ve id
	u: string    // user id (owner)
	p: string    // prompt
	m: string    // model id (from OpenRouter)
	g?: number   // video duration in seconds
	z?: string   // resolution
	r: number    // period (ms between generates)
	t: number    // retries count
	c?: string   // current_task_status: 'active' | 'done' | 'failed'
	l?: number   // last_run timestamp (epoch ms)
	d: number    // created timestamp
}
