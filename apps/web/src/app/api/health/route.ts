import { createHealthRouteHandler } from "@/lib/health-route";

// This route is APP_READY_PATH in team/config.sh: `app.sh start` polls it to
// decide the web app is ready (web -> API -> DB + queue).
export const dynamic = "force-dynamic";
export const GET = createHealthRouteHandler();
