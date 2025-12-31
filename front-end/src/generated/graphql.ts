import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@apollo/client/react';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  Int32: { input: any; output: any; }
  Int64: { input: any; output: any; }
  JSON: { input: any; output: any; }
  ObjectId: { input: any; output: any; }
};

export type Acl = {
  __typename?: 'ACL';
  canComment: Scalars['Boolean']['output'];
  canLike: Scalars['Boolean']['output'];
  canReply: Scalars['Boolean']['output'];
  canShare: Scalars['Boolean']['output'];
  canView: Scalars['Boolean']['output'];
};

export type Block = {
  _key: Scalars['ID']['output'];
  _type: BlockType;
};

export type BlockBlock = Block & {
  __typename?: 'BlockBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  children: Array<Span>;
  level?: Maybe<Scalars['Int']['output']>;
  listItem?: Maybe<ListItemType>;
  markDefs: Array<MarkDefs>;
  style: StyleType;
};

/** Block inputs */
export type BlockBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  children: Array<SpanInput>;
  level?: InputMaybe<Scalars['Int']['input']>;
  listItem?: InputMaybe<ListItemType>;
  markDefs: Array<MarkDefInput>;
  style: StyleType;
};

/** Oneof input for blocks */
export type BlockInput = {
  block?: InputMaybe<BlockBlockInput>;
  break?: InputMaybe<BreakBlockInput>;
  image?: InputMaybe<ImageBlockInput>;
};

/** A block of rich text */
export type BlockType =
  | 'block'
  | 'break'
  | 'image';

/** Union of all possible blocks */
export type Blocks = {
  __typename?: 'Blocks';
  block?: Maybe<BlockBlock>;
  break?: Maybe<BreakBlock>;
  image?: Maybe<ImageBlock>;
};

export type BreakBlock = Block & {
  __typename?: 'BreakBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
};

export type BreakBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
};

export type Channel = {
  __typename?: 'Channel';
  bannerImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int64']['output'];
  isFollower: Scalars['Boolean']['output'];
  isMember: Scalars['Boolean']['output'];
  membersCount?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  owner: Persona;
  posts: Array<Post>;
  profileImageUrl?: Maybe<Scalars['String']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  totalPosts: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Comment = {
  __typename?: 'Comment';
  _id: Scalars['ObjectId']['output'];
  allowedPersonaIds: Array<Scalars['Int64']['output']>;
  author: Persona;
  authorId: Scalars['Int64']['output'];
  content?: Maybe<PortableText>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deniedPersonaIds: Array<Scalars['Int64']['output']>;
  edited: Scalars['Boolean']['output'];
  meta: Meta;
  parentId: Scalars['ObjectId']['output'];
  personalizedMeta: PersonalizedMeta;
  privacy: Privacy;
  rawContent: Scalars['JSON']['output'];
  tags: Array<Scalars['String']['output']>;
  type: PostType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CommentInput = {
  allowedPersonaIds: Array<Scalars['Int64']['input']>;
  authorId: Scalars['Int64']['input'];
  content: SimpleInput;
  deniedPersonaIds: Array<Scalars['Int64']['input']>;
  level: Scalars['Int32']['input'];
  owner: OwnerInput;
  parentId: Scalars['ObjectId']['input'];
  privacy: Privacy;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** MarkDef for comments */
export type CommentMarkDef = MarkDef & {
  __typename?: 'CommentMarkDef';
  _key: Scalars['ID']['output'];
  _type: MarkDefType;
  text: Scalars['String']['output'];
};

export type CommentMarkDefInput = {
  _key: Scalars['ID']['input'];
  _type: MarkDefType;
  text: Scalars['String']['input'];
};

export type ImageBlock = Block & {
  __typename?: 'ImageBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  alt?: Maybe<Scalars['String']['output']>;
  caption?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['String']['output']>;
  src: Scalars['String']['output'];
  width?: Maybe<Scalars['String']['output']>;
};

export type ImageBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  alt?: InputMaybe<Scalars['String']['input']>;
  caption?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['String']['input']>;
  src: Scalars['String']['input'];
  width?: InputMaybe<Scalars['String']['input']>;
};

export type LikeInput = {
  liked: Scalars['Boolean']['input'];
  owner: OwnerInput;
  targetId: Scalars['ObjectId']['input'];
  targetType: PostType;
};

/** MarkDef for links */
export type LinkMarkDef = MarkDef & {
  __typename?: 'LinkMarkDef';
  _key: Scalars['ID']['output'];
  _type: MarkDefType;
  href: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

export type LinkMarkDefInput = {
  _key: Scalars['ID']['input'];
  _type: MarkDefType;
  href: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ListItemType =
  | 'bullet'
  | 'number';

/** Mark definitions (annotations) base */
export type MarkDef = {
  _key: Scalars['ID']['output'];
  _type: MarkDefType;
};

/** Oneof input for markDefs */
export type MarkDefInput = {
  comment?: InputMaybe<CommentMarkDefInput>;
  link?: InputMaybe<LinkMarkDefInput>;
};

export type MarkDefType =
  | 'comment'
  | 'link';

/** Union of all possible markDefs */
export type MarkDefs = {
  __typename?: 'MarkDefs';
  comment?: Maybe<CommentMarkDef>;
  link?: Maybe<LinkMarkDef>;
};

export type Media = {
  __typename?: 'Media';
  type: MediaType;
  url: Scalars['String']['output'];
};

export type MediaInput = {
  type: MediaType;
  url: Scalars['String']['input'];
};

export type MediaType =
  | 'GIF'
  | 'IMAGE'
  | 'VIDEO';

export type Meta = {
  __typename?: 'Meta';
  commentsCount?: Maybe<Scalars['Int32']['output']>;
  likesCount: Scalars['Int32']['output'];
  sharesCount: Scalars['Int32']['output'];
  viewsCount: Scalars['Int32']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createComment: PostGenericDocument;
  createLike: Scalars['Boolean']['output'];
  createPost: PostGenericDocument;
  deleteComment: Scalars['Boolean']['output'];
  deletePost: Scalars['Boolean']['output'];
  deleteReply: Scalars['Boolean']['output'];
};


export type MutationCreateCommentArgs = {
  input: CommentInput;
};


export type MutationCreateLikeArgs = {
  input: LikeInput;
};


export type MutationCreatePostArgs = {
  input: PostInput;
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ObjectId']['input'];
  owner: OwnerInput;
};


export type MutationDeletePostArgs = {
  id: Scalars['ObjectId']['input'];
  owner: OwnerInput;
};


export type MutationDeleteReplyArgs = {
  id: Scalars['ObjectId']['input'];
  owner: OwnerInput;
};

export type Owner = {
  __typename?: 'Owner';
  id: Scalars['Int64']['output'];
  type: OwnerType;
};

export type OwnerInput = {
  id: Scalars['Int64']['input'];
  type: OwnerType;
};

export type OwnerType =
  | 'CHANNEL'
  | 'PAGE'
  | 'PERSONA';

export type Persona = {
  __typename?: 'Persona';
  fullName: Scalars['String']['output'];
  id: Scalars['Int64']['output'];
  profileImageUrl?: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type PersonalizedMeta = {
  __typename?: 'PersonalizedMeta';
  acl: Acl;
  likedByPersona: Scalars['Boolean']['output'];
  sharedByPersona: Scalars['Boolean']['output'];
  viewedByPersona: Scalars['Boolean']['output'];
};

/** Top-level PortableText document */
export type PortableText = {
  __typename?: 'PortableText';
  blocks: Array<Blocks>;
};

export type PortableTextInput = {
  blocks: Array<BlockInput>;
};

export type Post = {
  __typename?: 'Post';
  _id: Scalars['ObjectId']['output'];
  allowedPersonaIds: Array<Scalars['Int64']['output']>;
  author: Persona;
  authorId: Scalars['Int64']['output'];
  content?: Maybe<PortableText>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deniedPersonaIds: Array<Scalars['Int64']['output']>;
  edited: Scalars['Boolean']['output'];
  meta: Meta;
  owner: Owner;
  personalizedMeta: PersonalizedMeta;
  privacy: Privacy;
  rawContent: Scalars['JSON']['output'];
  tags: Array<Scalars['String']['output']>;
  type: PostType;
  updatedAt: Scalars['DateTime']['output'];
};

export type PostGenericDocument = {
  __typename?: 'PostGenericDocument';
  _id: Scalars['ObjectId']['output'];
  allowedPersonaIds?: Maybe<Array<Scalars['Int64']['output']>>;
  authorId: Scalars['Int64']['output'];
  content?: Maybe<PortableText>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  deniedPersonaIds?: Maybe<Array<Scalars['Int64']['output']>>;
  edited: Scalars['Boolean']['output'];
  owner?: Maybe<Owner>;
  parentId?: Maybe<Scalars['ObjectId']['output']>;
  privacy: Privacy;
  rawContent: Scalars['JSON']['output'];
  tags: Array<Scalars['String']['output']>;
  type: PostType;
  updatedAt: Scalars['DateTime']['output'];
};

export type PostInput = {
  allowedPersonaIds: Array<Scalars['Int64']['input']>;
  authorId: Scalars['Int64']['input'];
  content: PortableTextInput;
  deniedPersonaIds: Array<Scalars['Int64']['input']>;
  owner: OwnerInput;
  privacy: Privacy;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type PostType =
  | 'COMMENT'
  | 'POST'
  | 'REPLY';

export type Privacy =
  | 'FRIENDS'
  | 'PRIVATE'
  | 'PUBLIC';

export type Query = {
  __typename?: 'Query';
  getChannel?: Maybe<Channel>;
  getComments: Array<Comment>;
  getPosts: Array<Post>;
};


export type QueryGetChannelArgs = {
  id: Scalars['Int64']['input'];
};


export type QueryGetCommentsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  parentId: Scalars['ObjectId']['input'];
};


export type QueryGetPostsArgs = {
  ids?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  owner: OwnerInput;
};

export type SimpleInput = {
  content: Scalars['String']['input'];
  type: SimpleInputType;
};

export type SimpleInputType =
  | 'MEDIA'
  | 'TEXT'
  | 'VOICE';

export type Span = {
  __typename?: 'Span';
  _key: Scalars['ID']['output'];
  _type: SpanType;
  marks: Array<Scalars['String']['output']>;
  text: Scalars['String']['output'];
};

export type SpanInput = {
  _key: Scalars['ID']['input'];
  _type: SpanType;
  marks: Array<Scalars['String']['input']>;
  text: Scalars['String']['input'];
};

/** A span of text inside a block */
export type SpanType =
  | 'span';

export type StyleType =
  | 'blockquote'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'normal';

export type CreateCommentMutationVariables = Exact<{
  parentId: Scalars['ObjectId']['input'];
  level: Scalars['Int32']['input'];
  authorId: Scalars['Int64']['input'];
  content: SimpleInput;
  tags?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  privacy: Privacy;
  owner: OwnerInput;
  allowedPersonaIds: Array<Scalars['Int64']['input']> | Scalars['Int64']['input'];
  deniedPersonaIds: Array<Scalars['Int64']['input']> | Scalars['Int64']['input'];
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment: { __typename?: 'PostGenericDocument', _id: any, authorId: any, rawContent: any, tags: Array<string>, privacy: Privacy, createdAt: string } };

export type CreatePostMutationVariables = Exact<{
  authorId: Scalars['Int64']['input'];
  content: PortableTextInput;
  tags?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  privacy: Privacy;
  owner: OwnerInput;
  allowedPersonaIds: Array<Scalars['Int64']['input']> | Scalars['Int64']['input'];
  deniedPersonaIds: Array<Scalars['Int64']['input']> | Scalars['Int64']['input'];
}>;


export type CreatePostMutation = { __typename?: 'Mutation', createPost: { __typename?: 'PostGenericDocument', _id: any, authorId: any, rawContent: any, tags: Array<string>, privacy: Privacy, createdAt: string, owner?: { __typename?: 'Owner', type: OwnerType } | null } };

export type CreateLikeMutationVariables = Exact<{
  targetId: Scalars['ObjectId']['input'];
  targetType: PostType;
  owner: OwnerInput;
  liked: Scalars['Boolean']['input'];
}>;


export type CreateLikeMutation = { __typename?: 'Mutation', createLike: boolean };

export type GetChannelQueryVariables = Exact<{
  id: Scalars['Int64']['input'];
}>;


export type GetChannelQuery = { __typename?: 'Query', getChannel?: { __typename?: 'Channel', id: any, name: string, description?: string | null, bannerImageUrl?: string | null, thumbnailUrl?: string | null, createdAt: string, totalPosts: number, isMember: boolean, isFollower: boolean, membersCount?: number | null, followersCount?: number | null, posts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }>, owner: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null } } | null };

export type GetCommentsQueryVariables = Exact<{
  parentId: Scalars['ObjectId']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCommentsQuery = { __typename?: 'Query', getComments: Array<{ __typename?: 'Comment', _id: any, type: PostType, parentId: any, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }> };

export type GetPostsQueryVariables = Exact<{
  owner: OwnerInput;
  ids?: InputMaybe<Array<Scalars['ObjectId']['input']> | Scalars['ObjectId']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetPostsQuery = { __typename?: 'Query', getPosts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }> };

export type CommentFieldsFragment = { __typename?: 'Comment', _id: any, type: PostType, parentId: any, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } };

export type MetaFieldsFragment = { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any };

export type PersonalizedMetaFieldsFragment = { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } };

export type PostFieldsFragment = { __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } };

export const MetaFieldsFragmentDoc = gql`
    fragment MetaFields on Meta {
  commentsCount
  likesCount
  viewsCount
  sharesCount
}
    `;
export const PersonalizedMetaFieldsFragmentDoc = gql`
    fragment PersonalizedMetaFields on PersonalizedMeta {
  likedByPersona
  viewedByPersona
  sharedByPersona
  acl {
    canView
    canLike
    canReply
    canShare
    canComment
  }
}
    `;
export const CommentFieldsFragmentDoc = gql`
    fragment CommentFields on Comment {
  _id
  type
  parentId
  authorId
  author {
    id
    username
    fullName
    profileImageUrl
  }
  rawContent
  createdAt
  privacy
  meta {
    ...MetaFields
  }
  personalizedMeta {
    ...PersonalizedMetaFields
  }
  allowedPersonaIds
  deniedPersonaIds
  edited
  tags
  updatedAt
}
    ${MetaFieldsFragmentDoc}
${PersonalizedMetaFieldsFragmentDoc}`;
export const PostFieldsFragmentDoc = gql`
    fragment PostFields on Post {
  _id
  type
  authorId
  author {
    id
    username
    fullName
    profileImageUrl
  }
  owner {
    id
    type
  }
  rawContent
  createdAt
  privacy
  meta {
    ...MetaFields
  }
  personalizedMeta {
    ...PersonalizedMetaFields
  }
  allowedPersonaIds
  deniedPersonaIds
  edited
  tags
  updatedAt
}
    ${MetaFieldsFragmentDoc}
${PersonalizedMetaFieldsFragmentDoc}`;
export const CreateCommentDocument = gql`
    mutation CreateComment($parentId: ObjectId!, $level: Int32!, $authorId: Int64!, $content: SimpleInput!, $tags: [String!], $privacy: Privacy!, $owner: OwnerInput!, $allowedPersonaIds: [Int64!]!, $deniedPersonaIds: [Int64!]!) {
  createComment(
    input: {owner: $owner, parentId: $parentId, level: $level, authorId: $authorId, tags: $tags, privacy: $privacy, content: $content, allowedPersonaIds: $allowedPersonaIds, deniedPersonaIds: $deniedPersonaIds}
  ) {
    _id
    authorId
    rawContent
    tags
    privacy
    createdAt
  }
}
    `;
export type CreateCommentMutationFn = Apollo.MutationFunction<CreateCommentMutation, CreateCommentMutationVariables>;

/**
 * __useCreateCommentMutation__
 *
 * To run a mutation, you first call `useCreateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommentMutation, { data, loading, error }] = useCreateCommentMutation({
 *   variables: {
 *      parentId: // value for 'parentId'
 *      level: // value for 'level'
 *      authorId: // value for 'authorId'
 *      content: // value for 'content'
 *      tags: // value for 'tags'
 *      privacy: // value for 'privacy'
 *      owner: // value for 'owner'
 *      allowedPersonaIds: // value for 'allowedPersonaIds'
 *      deniedPersonaIds: // value for 'deniedPersonaIds'
 *   },
 * });
 */
export function useCreateCommentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCommentMutation, CreateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCommentMutation, CreateCommentMutationVariables>(CreateCommentDocument, options);
      }
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>;
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutation>;
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<CreateCommentMutation, CreateCommentMutationVariables>;
export const CreatePostDocument = gql`
    mutation CreatePost($authorId: Int64!, $content: PortableTextInput!, $tags: [String!], $privacy: Privacy!, $owner: OwnerInput!, $allowedPersonaIds: [Int64!]!, $deniedPersonaIds: [Int64!]!) {
  createPost(
    input: {authorId: $authorId, tags: $tags, privacy: $privacy, owner: $owner, content: $content, deniedPersonaIds: $deniedPersonaIds, allowedPersonaIds: $allowedPersonaIds}
  ) {
    _id
    authorId
    owner {
      type
    }
    rawContent
    tags
    privacy
    createdAt
  }
}
    `;
export type CreatePostMutationFn = Apollo.MutationFunction<CreatePostMutation, CreatePostMutationVariables>;

/**
 * __useCreatePostMutation__
 *
 * To run a mutation, you first call `useCreatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPostMutation, { data, loading, error }] = useCreatePostMutation({
 *   variables: {
 *      authorId: // value for 'authorId'
 *      content: // value for 'content'
 *      tags: // value for 'tags'
 *      privacy: // value for 'privacy'
 *      owner: // value for 'owner'
 *      allowedPersonaIds: // value for 'allowedPersonaIds'
 *      deniedPersonaIds: // value for 'deniedPersonaIds'
 *   },
 * });
 */
export function useCreatePostMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreatePostMutation, CreatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreatePostMutation, CreatePostMutationVariables>(CreatePostDocument, options);
      }
export type CreatePostMutationHookResult = ReturnType<typeof useCreatePostMutation>;
export type CreatePostMutationResult = Apollo.MutationResult<CreatePostMutation>;
export type CreatePostMutationOptions = Apollo.BaseMutationOptions<CreatePostMutation, CreatePostMutationVariables>;
export const CreateLikeDocument = gql`
    mutation CreateLike($targetId: ObjectId!, $targetType: PostType!, $owner: OwnerInput!, $liked: Boolean!) {
  createLike(
    input: {owner: $owner, targetId: $targetId, targetType: $targetType, liked: $liked}
  )
}
    `;
export type CreateLikeMutationFn = Apollo.MutationFunction<CreateLikeMutation, CreateLikeMutationVariables>;

/**
 * __useCreateLikeMutation__
 *
 * To run a mutation, you first call `useCreateLikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateLikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createLikeMutation, { data, loading, error }] = useCreateLikeMutation({
 *   variables: {
 *      targetId: // value for 'targetId'
 *      targetType: // value for 'targetType'
 *      owner: // value for 'owner'
 *      liked: // value for 'liked'
 *   },
 * });
 */
export function useCreateLikeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateLikeMutation, CreateLikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateLikeMutation, CreateLikeMutationVariables>(CreateLikeDocument, options);
      }
export type CreateLikeMutationHookResult = ReturnType<typeof useCreateLikeMutation>;
export type CreateLikeMutationResult = Apollo.MutationResult<CreateLikeMutation>;
export type CreateLikeMutationOptions = Apollo.BaseMutationOptions<CreateLikeMutation, CreateLikeMutationVariables>;
export const GetChannelDocument = gql`
    query GetChannel($id: Int64!) {
  getChannel(id: $id) {
    id
    name
    description
    bannerImageUrl
    thumbnailUrl
    createdAt
    posts {
      ...PostFields
    }
    totalPosts
    owner {
      id
      username
      fullName
      profileImageUrl
    }
    isMember
    isFollower
    membersCount
    followersCount
  }
}
    ${PostFieldsFragmentDoc}`;

/**
 * __useGetChannelQuery__
 *
 * To run a query within a React component, call `useGetChannelQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetChannelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetChannelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetChannelQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetChannelQuery, GetChannelQueryVariables> & ({ variables: GetChannelQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetChannelQuery, GetChannelQueryVariables>(GetChannelDocument, options);
      }
export function useGetChannelLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetChannelQuery, GetChannelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetChannelQuery, GetChannelQueryVariables>(GetChannelDocument, options);
        }
export function useGetChannelSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetChannelQuery, GetChannelQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetChannelQuery, GetChannelQueryVariables>(GetChannelDocument, options);
        }
export type GetChannelQueryHookResult = ReturnType<typeof useGetChannelQuery>;
export type GetChannelLazyQueryHookResult = ReturnType<typeof useGetChannelLazyQuery>;
export type GetChannelSuspenseQueryHookResult = ReturnType<typeof useGetChannelSuspenseQuery>;
export type GetChannelQueryResult = Apollo.QueryResult<GetChannelQuery, GetChannelQueryVariables>;
export const GetCommentsDocument = gql`
    query GetComments($parentId: ObjectId!, $limit: Int, $offset: Int) {
  getComments(parentId: $parentId, limit: $limit, offset: $offset) {
    ...CommentFields
  }
}
    ${CommentFieldsFragmentDoc}`;

/**
 * __useGetCommentsQuery__
 *
 * To run a query within a React component, call `useGetCommentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCommentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCommentsQuery({
 *   variables: {
 *      parentId: // value for 'parentId'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetCommentsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables> & ({ variables: GetCommentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
      }
export function useGetCommentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
        }
export function useGetCommentsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetCommentsQuery, GetCommentsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetCommentsQuery, GetCommentsQueryVariables>(GetCommentsDocument, options);
        }
export type GetCommentsQueryHookResult = ReturnType<typeof useGetCommentsQuery>;
export type GetCommentsLazyQueryHookResult = ReturnType<typeof useGetCommentsLazyQuery>;
export type GetCommentsSuspenseQueryHookResult = ReturnType<typeof useGetCommentsSuspenseQuery>;
export type GetCommentsQueryResult = Apollo.QueryResult<GetCommentsQuery, GetCommentsQueryVariables>;
export const GetPostsDocument = gql`
    query GetPosts($owner: OwnerInput!, $ids: [ObjectId!], $limit: Int, $offset: Int) {
  getPosts(owner: $owner, ids: $ids, limit: $limit, offset: $offset) {
    ...PostFields
  }
}
    ${PostFieldsFragmentDoc}`;

/**
 * __useGetPostsQuery__
 *
 * To run a query within a React component, call `useGetPostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPostsQuery({
 *   variables: {
 *      owner: // value for 'owner'
 *      ids: // value for 'ids'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetPostsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPostsQuery, GetPostsQueryVariables> & ({ variables: GetPostsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPostsQuery, GetPostsQueryVariables>(GetPostsDocument, options);
      }
export function useGetPostsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPostsQuery, GetPostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPostsQuery, GetPostsQueryVariables>(GetPostsDocument, options);
        }
export function useGetPostsSuspenseQuery(baseOptions?: ApolloReactHooks.SkipToken | ApolloReactHooks.SuspenseQueryHookOptions<GetPostsQuery, GetPostsQueryVariables>) {
          const options = baseOptions === ApolloReactHooks.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useSuspenseQuery<GetPostsQuery, GetPostsQueryVariables>(GetPostsDocument, options);
        }
export type GetPostsQueryHookResult = ReturnType<typeof useGetPostsQuery>;
export type GetPostsLazyQueryHookResult = ReturnType<typeof useGetPostsLazyQuery>;
export type GetPostsSuspenseQueryHookResult = ReturnType<typeof useGetPostsSuspenseQuery>;
export type GetPostsQueryResult = Apollo.QueryResult<GetPostsQuery, GetPostsQueryVariables>;