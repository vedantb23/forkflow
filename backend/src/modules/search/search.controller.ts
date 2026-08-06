import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { searchService } from "./search.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export const searchMenuItems = asyncHandler(async (req: Request, res: Response) => {
  const { query, history } = req.body;

  if (!query || typeof query !== "string") {
    throw ApiError.badRequest("Please provide a valid 'query' string in the request body.");
  }

  const result = await searchService.search(query, history);

  sendSuccess(res, result);
});
