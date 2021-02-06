import {
  Arg,
  Mutation,
  Resolver,
  Field,
  Ctx,
  ObjectType,
  Query,
  FieldResolver,
  Root,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "../types";
import argon2 from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UserNamePasswordInput } from "../types/Input/UserNamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";
import { FieldError } from "../types/Error/FieldError";

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    //check the user's id same with logged user's id
    //if same and its ok to show their own email
    if (req.session.userId === user.id) return user.email;

    //current user wants to see someone else email
    return "";
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Must be greater than 2 characters.",
          },
        ],
      };
    }
    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    const userIdNum = parseInt(userId as string);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token expired.",
          },
        ],
      };
    }
    let user = await User.findOne(userIdNum);
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exist.",
          },
        ],
      };
    }

    await User.update(
      { id: userIdNum },
      {
        password: await argon2.hash(newPassword),
      }
    );

    await redis.del(key);

    //auto log in after user reset  his password
    req.session.userId = userId;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      //the email doesnt exist in the db
      return true;
    }
    const token = v4();

    redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    ); // 3 days

    await sendEmail(
      email,
      `<a href="http://localhost:4000/change-password/${token}">Reset password</a>`
    );
    return true;
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    const users = await User.find();
    return users;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    //user not logged int
    const id = req.session.userId;

    if (!id) return null;

    return User.findOne(id);
  }

  //Buradan davam et
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UserNamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    console.log(errors);
    if (errors) return { errors };
    const hashedPassword = await argon2.hash(options.password);
    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          email: options.email,
          password: hashedPassword,
        })
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err: any) {
      // console.log("error : ", err);
      if (err.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "This username already taken",
            },
          ],
        };
      }
    }

    //store user id in session
    //keep logged in user
    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors: FieldError[] = [];
    let user: User;
    user = (await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    )) as User;
    let valid = false;
    console.log("user", user, usernameOrEmail, password);
    if (user) {
      valid = await argon2.verify(user.password, password);
    }

    if (!user) {
      errors.push({
        field: "usernameOrEmail",
        message: "Username or Email doesn't exist",
      });
    }

    if (!valid) {
      errors.push({ field: "password", message: "Password is incorrect" });
    }

    if (usernameOrEmail.length <= 2) {
      errors.push({
        field: "usernameOrEmail",
        message: "Must be greater than 2 characters.",
      });
    }
    if (password.length <= 2) {
      errors.push({
        field: "password",
        message: "Must be greater than 2 characters.",
      });
    }

    if (errors.length > 0) {
      return {
        errors,
      };
    }
    req.session.userId = user?.id;

    return {
      user,
    };
  }
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err: Error) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
