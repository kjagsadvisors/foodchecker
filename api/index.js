// Vercel entry point. `npm run build` compiles src/ to dist/ first (see vercel.json).
import { handle } from "../dist/app.js";

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = handle;
