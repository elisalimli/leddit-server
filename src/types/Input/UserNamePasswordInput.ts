import { InputType, Field } from "type-graphql";

@InputType()
export class UserNamePasswordInput {
  @Field()
  username: string;
  @Field()
  email: string;
  @Field()
  password: string;
}
