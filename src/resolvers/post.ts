import {
  Arg,
  Query,
  Resolver,
  Mutation,
  Int,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
} from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { isURL } from "../utils/isURL";
import { getConnection } from "typeorm";
import { PostResponse } from "../types/Response/PostResponse";
import { PostInput } from "../types/Input/PostInput";
import { PaginatedPosts } from "../types/Other/PaginatedPosts";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    return root.text.slice(0, 150);
  }

  @FieldResolver(() => User)
  creator(@Root() root: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(root.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() root: Post,
    @Ctx() { updootLoader, req }: MyContext
  ) {
    if (!req.session.userId) return null;

    const updoot = await updootLoader.load({
      postId: root.id,
      userId: req.session.userId,
    });

    return updoot ? updoot.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    //user may be give the value 32
    //and that's why i am checking equal to 1 or not
    const isUpdoot = value === 1;
    let realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;

    const updoot = await Updoot.findOne({
      where: {
        postId,
        userId,
      },
    });

    //the user has voted on the post before
    //and they are changing their vote
    if (updoot && updoot.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
           update updoot 
           set value = $1
           where "postId" = $2 and "userId" = $3            
           `,

          [realValue, postId, userId]
        );
        //ass
        await tm.query(
          `
          update "Post" 
          set points = points + $1
          where id = $2
          `,

          [realValue * 2, postId]
        );
      });
    } else if (!updoot) {
      //has never voted before
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          insert into updoot ("userId","postId",value)
          values($1,$2,$3)
          `,

          [userId, postId, realValue]
        );

        await tm.query(
          `
          update "Post" 
          set points = points + $1
          where id = $2
          `,

          [realValue, postId]
        );
      });
    }

    return true;
  }

  @Mutation(() => Boolean)
  async deleteAllPosts() {
    await Post.delete({});
    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    //20 -> 20
    //if there is 21 posts that means we can fetch more posts
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const replacements: any[] = [realLimitPlusOne];

    if (cursor) replacements.push(new Date(parseInt(cursor)));

    const posts = await getConnection().query(
      `
      select p.* from "Post" p
      ${cursor ? `where p."createdAt" < $2` : ""}
      order by p."createdAt" DESC
     limit $1
     `,
      replacements
    );

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    const replacements = [id];

    const data = await Post.findOne(id);

    const comments = await getConnection().query(
      `
      select * from comment
      where "postId" = $1
      order by "createdAt" DESC
      `,
      replacements
    );

    data!.comments = comments;

    return data;
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<PostResponse> {
    if (input.imageURL !== null) {
      if (!isURL(input.imageURL)) {
        return {
          errors: [
            {
              field: "file",
              message: "Invalid URL",
            },
          ],
        };
      }
    }

    const post = await Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();

    return {
      post,
    };
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string,
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    // const post = await Post.findOne(id);
    // if (!post) return null;
    //   post.title = title;
    //   Post.update({ id,creatorId:req.session.userId }, { title,text });
    // }
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();
    console.log("updated post ?", result.raw[0]);
    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      //not cascade way
      // const post = await Post.findOne(id);
      // if (!post) return false;
      // if (post?.creatorId !== req.session.userId) {
      //   throw new Error("Not authenticated");
      // }
      // await Comment.delete({ postId: id });
      // await Updoot.delete({ postId: id });
      await Post.delete({ id, creatorId: req.session.userId });
      return true;
    } catch (error) {
      return false;
    }
  }
}
