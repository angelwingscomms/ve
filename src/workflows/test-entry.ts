import { VideoGeneratorWorkflow } from './video_generator';
import { ImageGeneratorWorkflow } from './image_generator';
export default { async fetch() { return new Response(null, { status: 404 }); } };
export { VideoGeneratorWorkflow, ImageGeneratorWorkflow };
