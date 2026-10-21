/** Library entry: use the scorer directly from code. */
export { score, scoreProduct, ratingFor } from "./core/score.js";
export { computeNutriScore } from "./core/nutriscore.js";
export { analyzeIngredients } from "./core/ingredients.js";
export { ADDITIVES, findAdditive } from "./core/additives.js";
export { createServer } from "./mcp/server.js";
export { handle } from "./app.js";
export type * from "./core/types.js";
