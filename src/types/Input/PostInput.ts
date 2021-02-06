import { InputType, Field } from "type-graphql";

@InputType()
export class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;

  @Field(() => String, { nullable: true })
  imageURL: string;
}
