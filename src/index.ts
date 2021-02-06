//Server stuffs
import "reflect-metadata";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import connectRedis from "connect-redis";
import session from "express-session";
import { isProduction, COOKIE_NAME } from "./constants";
import cors from "cors";
import path from "path";
import { createConnection } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { Updoot } from "./entities/Updoot";
import { Comment } from "./entities/Comment";
import { CommentResolver } from "./resolvers/comment";
import { createUserLoader } from "./utils/DataLoaders/CreateUserLoader";
import { createVoteStatusLoader } from "./utils/DataLoaders/CreateVoteStatusLoader";

const PORT = process.env.PORT || 3000;
//
const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    database: "leddit",
    username: "postgres",
    password: "postgres",
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Updoot, Comment],
  });

  await conn.runMigrations();
  const app = express();

  //Redis stuffss
  const RedisStore = connectRedis(session);
  const redis = new Redis();

  app.use(
    cors({
      origin: "http://localhost:4000",
      credentials: true,
    })
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis as any,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 366 * 10, //10 years
        httpOnly: true,
        sameSite: "lax", //csrf
        secure: isProduction, // cookie only works in https
      },
      secret: "hello world",
      resave: false,
      saveUninitialized: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver, CommentResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      updootLoader: createVoteStatusLoader(),
    }),
  });

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`);
  });
};

main().catch((err) => {
  console.log(err);
});
