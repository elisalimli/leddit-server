import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUserLoader } from "./utils/DataLoaders/CreateUserLoader";
import { createVoteStatusLoader } from "./utils/DataLoaders/CreateVoteStatusLoader";

export interface MyContext {
  req: Request & any;
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  updootLoader: ReturnType<typeof createVoteStatusLoader>;
}
