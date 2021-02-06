import {
  Mutation,
  Resolver,
  ObjectType,
  InputType,
  Field,
  UseMiddleware,
  Arg,
  Ctx,
} from "type-graphql";
import { FieldError } from "../types/Error/FieldError";
import { isAuth } from "../middleware/isAuth";
import { Comment } from "../entities/Comment";
import { MyContext } from "../types";
import { getConnection } from "typeorm";
import Post from "../entities/Post";

@ObjectType()
export class CommentResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Comment, { nullable: true })
  comment?: Comment;
}

@InputType()
export class CreatePostInput {
  @Field()
  text!: string;

  @Field()
  postId!: number;
}

@Resolver()
export class CommentResolver {
  @Mutation(() => CommentResponse)
  @UseMiddleware(isAuth)
  async createComment(
    @Arg("input", () => CreatePostInput) input: CreatePostInput,
    @Ctx() { req }: MyContext
  ): Promise<CommentResponse> {
    const errors: FieldError[] = [];
    let comment;
    if (input.text.length < 2) {
      errors.push({ field: "text", message: "Length must be greater than 2" });
    }

    if (errors.length > 0) {
      return {
        errors,
      };
    }

    await getConnection().transaction(async (tm) => {
      comment = await Comment.create({
        ...input,
        creatorId: req.session.userId,
      }).save();
      await tm.query(
        `
       update "Post" 
       set "commentCount" = "commentCount" + 1
       where id = $1 
       `,
        [input.postId]
      );
    });
    return {
      comment,
    };
  }

  @Mutation(() => Boolean)
  async deleteComment(
    @Arg("id") id: number,
    @Arg("postId") postId: number,
    @Ctx() { req }: MyContext
  ): Promise<Boolean | String> {
    //   try {
    //     await Comment.delete(id);
    //     return true;
    //   } catch (error) {
    //     return false;
    //   }
    await getConnection().transaction(async (tm) => {
      await tm.query(
        `
    update "Post" 
    set "commentCount" = "commentCount" - 1
    where id = $1; 
   `
      ),
        [postId];

      await getConnection().query(
        `
    delete from comment
    where id = $1 and "creatorId" = $2 
    `,
        [id, req.session.userId]
      );
    });

    return true;
  }
}
