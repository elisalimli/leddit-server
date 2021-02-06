"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentResolver = exports.CreatePostInput = exports.CommentResponse = void 0;
const type_graphql_1 = require("type-graphql");
const FieldError_1 = require("../types/Error/FieldError");
const isAuth_1 = require("../middleware/isAuth");
const Comment_1 = require("../entities/Comment");
const typeorm_1 = require("typeorm");
let CommentResponse = class CommentResponse {
};
__decorate([
    type_graphql_1.Field(() => [FieldError_1.FieldError], { nullable: true }),
    __metadata("design:type", Array)
], CommentResponse.prototype, "errors", void 0);
__decorate([
    type_graphql_1.Field(() => Comment_1.Comment, { nullable: true }),
    __metadata("design:type", Comment_1.Comment)
], CommentResponse.prototype, "comment", void 0);
CommentResponse = __decorate([
    type_graphql_1.ObjectType()
], CommentResponse);
exports.CommentResponse = CommentResponse;
let CreatePostInput = class CreatePostInput {
};
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", String)
], CreatePostInput.prototype, "text", void 0);
__decorate([
    type_graphql_1.Field(),
    __metadata("design:type", Number)
], CreatePostInput.prototype, "postId", void 0);
CreatePostInput = __decorate([
    type_graphql_1.InputType()
], CreatePostInput);
exports.CreatePostInput = CreatePostInput;
let CommentResolver = class CommentResolver {
    createComment(input, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            let comment;
            if (input.text.length < 2) {
                errors.push({ field: "text", message: "Length must be greater than 2" });
            }
            if (errors.length > 0) {
                return {
                    errors,
                };
            }
            yield typeorm_1.getConnection().transaction((tm) => __awaiter(this, void 0, void 0, function* () {
                comment = yield Comment_1.Comment.create(Object.assign(Object.assign({}, input), { creatorId: req.session.userId })).save();
                yield tm.query(`
       update "Post" 
       set "commentCount" = "commentCount" + 1
       where id = $1 
       `, [input.postId]);
            }));
            return {
                comment,
            };
        });
    }
    deleteComment(id, postId, { req }) {
        return __awaiter(this, void 0, void 0, function* () {
            yield typeorm_1.getConnection().transaction((tm) => __awaiter(this, void 0, void 0, function* () {
                yield tm.query(`
    update "Post" 
    set "commentCount" = "commentCount" - 1
    where id = $1; 
   `),
                    [postId];
                yield typeorm_1.getConnection().query(`
    delete from comment
    where id = $1 and "creatorId" = $2 
    `, [id, req.session.userId]);
            }));
            return true;
        });
    }
};
__decorate([
    type_graphql_1.Mutation(() => CommentResponse),
    type_graphql_1.UseMiddleware(isAuth_1.isAuth),
    __param(0, type_graphql_1.Arg("input", () => CreatePostInput)),
    __param(1, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePostInput, Object]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "createComment", null);
__decorate([
    type_graphql_1.Mutation(() => Boolean),
    __param(0, type_graphql_1.Arg("id")),
    __param(1, type_graphql_1.Arg("postId")),
    __param(2, type_graphql_1.Ctx()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], CommentResolver.prototype, "deleteComment", null);
CommentResolver = __decorate([
    type_graphql_1.Resolver()
], CommentResolver);
exports.CommentResolver = CommentResolver;
//# sourceMappingURL=comment.js.map