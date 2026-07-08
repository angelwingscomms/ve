declare global {
	namespace App {
		interface Locals {
			user: { id: string; name: string; picture?: string; email?: string } | null;
		}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
			cron?: string;
		}
	}
}

export {};
