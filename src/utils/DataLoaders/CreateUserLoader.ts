import DataLoader from "dataloader";
import { User } from "../../entities/User";

//we give users' id and...
// [ 1,2,3,4 ]
//he run sql which give back to use user infos
//  [ {id:1,username:"ali"}, {id:2,username:"husi"}, {}, {} ]

export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => (userIdToUser[u.id] = u));
    return userIds.map((userId) => userIdToUser[userId]);
  });
