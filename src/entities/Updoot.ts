import { Field, ObjectType, Int } from "type-graphql";
import { Entity, Column, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@Entity()
export class Updoot extends BaseEntity {
  @Column({ type: "int" })
  value: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @PrimaryColumn()
  postId: number;

  @ManyToOne(() => Post, (post) => post.updoots, { onDelete: "CASCADE" })
  post: Post;
}
