import { Field, ObjectType, Int } from "type-graphql";
import {
  Entity,
  Column,
  BaseEntity,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity()
export class Comment extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column()
  text!: String;

  @PrimaryColumn()
  creatorId!: number;

  @ManyToOne(() => User)
  creator: User;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: "CASCADE" })
  post: Post;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
