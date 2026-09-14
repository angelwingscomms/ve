export { VideoGeneratorWorkflow } from './video_generator';
export { ImageGeneratorWorkflow } from './image_generator';
export default {
	async scheduled(_e: ScheduledEvent, env: Env) {
		await fetch(`${env.ORIGIN}/api/internal/tick`, {
			method: 'POST',
			headers: { 'x-internal-key': env.INTERNAL_KEY }
		});
	}
};
