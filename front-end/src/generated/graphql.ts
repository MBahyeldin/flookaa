import type { TypedDocumentNode as DocumentNode } from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
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

export type AccordionBlock = Block & {
  __typename?: 'AccordionBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  allowMultiple?: Maybe<Scalars['Boolean']['output']>;
  defaultFirstOpen?: Maybe<Scalars['Boolean']['output']>;
  items: Array<AccordionItem>;
  title?: Maybe<Scalars['String']['output']>;
};

export type AccordionBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  allowMultiple?: InputMaybe<Scalars['Boolean']['input']>;
  defaultFirstOpen?: InputMaybe<Scalars['Boolean']['input']>;
  items: Array<AccordionItemInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type AccordionItem = {
  __typename?: 'AccordionItem';
  _key: Scalars['ID']['output'];
  text: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AccordionItemInput = {
  _key: Scalars['ID']['input'];
  text: Scalars['String']['input'];
  title: Scalars['String']['input'];
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
  accordion?: InputMaybe<AccordionBlockInput>;
  block?: InputMaybe<BlockBlockInput>;
  break?: InputMaybe<BreakBlockInput>;
  callout?: InputMaybe<CalloutBlockInput>;
  checklist?: InputMaybe<ChecklistBlockInput>;
  countdown?: InputMaybe<CountdownBlockInput>;
  gallery?: InputMaybe<GalleryBlockInput>;
  image?: InputMaybe<ImageBlockInput>;
  quote?: InputMaybe<QuoteBlockInput>;
  spoiler?: InputMaybe<SpoilerBlockInput>;
  steps?: InputMaybe<StepsBlockInput>;
  voiceNote?: InputMaybe<VoiceNoteBlockInput>;
};

/** A block of rich text */
export type BlockType =
  | 'accordion'
  | 'block'
  | 'break'
  | 'callout'
  | 'checklist'
  | 'countdown'
  | 'gallery'
  | 'image'
  | 'quote'
  | 'spoiler'
  | 'steps'
  | 'voiceNote';

/** Union of all possible blocks */
export type Blocks = {
  __typename?: 'Blocks';
  accordion?: Maybe<AccordionBlock>;
  block?: Maybe<BlockBlock>;
  break?: Maybe<BreakBlock>;
  callout?: Maybe<CalloutBlock>;
  checklist?: Maybe<ChecklistBlock>;
  countdown?: Maybe<CountdownBlock>;
  gallery?: Maybe<GalleryBlock>;
  image?: Maybe<ImageBlock>;
  quote?: Maybe<QuoteBlock>;
  spoiler?: Maybe<SpoilerBlock>;
  steps?: Maybe<StepsBlock>;
  voiceNote?: Maybe<VoiceNoteBlock>;
};

export type BreakBlock = Block & {
  __typename?: 'BreakBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  style?: Maybe<BreakStyle>;
};

export type BreakBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  style?: InputMaybe<BreakStyle>;
};

export type BreakStyle =
  | 'dashed'
  | 'dots'
  | 'line'
  | 'ornament';

export type CalloutBlock = Block & {
  __typename?: 'CalloutBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  description: Scalars['String']['output'];
  icon?: Maybe<CalloutIcon>;
  tag?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  tone?: Maybe<CalloutTone>;
};

export type CalloutBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  description: Scalars['String']['input'];
  icon?: InputMaybe<CalloutIcon>;
  tag?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  tone?: InputMaybe<CalloutTone>;
};

export type CalloutIcon =
  | 'alert'
  | 'check'
  | 'error'
  | 'heart'
  | 'info'
  | 'lightbulb'
  | 'megaphone'
  | 'none'
  | 'star';

export type CalloutTone =
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

export type Channel = {
  __typename?: 'Channel';
  bannerImageUrl?: Maybe<Scalars['String']['output']>;
  canModerate: Scalars['Boolean']['output'];
  community?: Maybe<CommunityRef>;
  coverPattern: CoverPattern;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int64']['output'];
  isFollower: Scalars['Boolean']['output'];
  isMember: Scalars['Boolean']['output'];
  isOwner: Scalars['Boolean']['output'];
  isPending: Scalars['Boolean']['output'];
  isPrivate: Scalars['Boolean']['output'];
  membersCount?: Maybe<Scalars['Int']['output']>;
  minAge: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ownTheme?: Maybe<Theme>;
  owner: Persona;
  posts: Array<Post>;
  profileImageUrl?: Maybe<Scalars['String']['output']>;
  theme: Theme;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  totalPosts: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ChecklistBlock = Block & {
  __typename?: 'ChecklistBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  items: Array<ChecklistItem>;
  title?: Maybe<Scalars['String']['output']>;
};

export type ChecklistBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  items: Array<ChecklistItemInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ChecklistItem = {
  __typename?: 'ChecklistItem';
  _key: Scalars['ID']['output'];
  checked: Scalars['Boolean']['output'];
  text: Scalars['String']['output'];
};

export type ChecklistItemInput = {
  _key: Scalars['ID']['input'];
  checked?: InputMaybe<Scalars['Boolean']['input']>;
  text: Scalars['String']['input'];
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

export type CommunityRef = {
  __typename?: 'CommunityRef';
  id: Scalars['Int64']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type CountdownBlock = Block & {
  __typename?: 'CountdownBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  endedText?: Maybe<Scalars['String']['output']>;
  endsAt: Scalars['DateTime']['output'];
  label?: Maybe<Scalars['String']['output']>;
};

export type CountdownBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  endedText?: InputMaybe<Scalars['String']['input']>;
  endsAt: Scalars['DateTime']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
};

export type CoverPattern =
  | 'hills'
  | 'horizon'
  | 'stripes'
  | 'waves';

export type FeedChannel = {
  __typename?: 'FeedChannel';
  canModerate: Scalars['Boolean']['output'];
  id: Scalars['Int64']['output'];
  name: Scalars['String']['output'];
  theme: Theme;
  thumbnail: Scalars['String']['output'];
};

export type FeedPage = {
  __typename?: 'FeedPage';
  channels: Array<FeedChannel>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  posts: Array<Post>;
};

export type GalleryBlock = Block & {
  __typename?: 'GalleryBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  items: Array<GalleryItem>;
  layout?: Maybe<GalleryLayout>;
};

export type GalleryBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  items: Array<GalleryItemInput>;
  layout?: InputMaybe<GalleryLayout>;
};

export type GalleryItem = {
  __typename?: 'GalleryItem';
  _key: Scalars['ID']['output'];
  alt?: Maybe<Scalars['String']['output']>;
  caption?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  src: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type GalleryItemInput = {
  _key: Scalars['ID']['input'];
  alt?: InputMaybe<Scalars['String']['input']>;
  caption?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  src: Scalars['String']['input'];
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type GalleryLayout =
  | 'carousel'
  | 'grid';

export type ImageAlign =
  | 'center'
  | 'left'
  | 'right';

export type ImageBlock = Block & {
  __typename?: 'ImageBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  align?: Maybe<ImageAlign>;
  alt?: Maybe<Scalars['String']['output']>;
  caption?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  size?: Maybe<ImageSize>;
  src: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type ImageBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  align?: InputMaybe<ImageAlign>;
  alt?: InputMaybe<Scalars['String']['input']>;
  caption?: InputMaybe<Scalars['String']['input']>;
  height?: InputMaybe<Scalars['Int']['input']>;
  size?: InputMaybe<ImageSize>;
  src: Scalars['String']['input'];
  width?: InputMaybe<Scalars['Int']['input']>;
};

export type ImageSize =
  | 'l'
  | 'm'
  | 's'
  | 'xl'
  | 'xs';

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
  link?: InputMaybe<LinkMarkDefInput>;
};

export type MarkDefType =
  | 'link';

/** Union of all possible markDefs */
export type MarkDefs = {
  __typename?: 'MarkDefs';
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
};


export type MutationDeletePostArgs = {
  id: Scalars['ObjectId']['input'];
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
  anonymous: Scalars['Boolean']['output'];
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
  getDiscover: FeedPage;
  getFeed: FeedPage;
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


export type QueryGetDiscoverArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  interests?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetFeedArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetPostsArgs = {
  ids?: InputMaybe<Array<Scalars['ObjectId']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  owner: OwnerInput;
};

export type QuoteBlock = Block & {
  __typename?: 'QuoteBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  name?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Scalars['String']['output']>;
  text: Scalars['String']['output'];
};

export type QuoteBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  name?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  text: Scalars['String']['input'];
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

export type SpoilerBlock = Block & {
  __typename?: 'SpoilerBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  content: Array<Blocks>;
  label?: Maybe<Scalars['String']['output']>;
};

export type SpoilerBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  content: Array<BlockInput>;
  label?: InputMaybe<Scalars['String']['input']>;
};

export type StepItem = {
  __typename?: 'StepItem';
  _key: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type StepItemInput = {
  _key: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type StepsBlock = Block & {
  __typename?: 'StepsBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  items: Array<StepItem>;
  title?: Maybe<Scalars['String']['output']>;
};

export type StepsBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  items: Array<StepItemInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type StyleType =
  | 'blockquote'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'normal';

export type Theme =
  | 'ember'
  | 'forest'
  | 'plum'
  | 'rose'
  | 'slate'
  | 'tide';

export type VoiceNoteBlock = Block & {
  __typename?: 'VoiceNoteBlock';
  _key: Scalars['ID']['output'];
  _type: BlockType;
  duration?: Maybe<Scalars['Int']['output']>;
  src: Scalars['String']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

export type VoiceNoteBlockInput = {
  _key: Scalars['ID']['input'];
  _type: BlockType;
  duration?: InputMaybe<Scalars['Int']['input']>;
  src: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

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

export type DeleteCommentMutationVariables = Exact<{
  id: Scalars['ObjectId']['input'];
}>;


export type DeleteCommentMutation = { __typename?: 'Mutation', deleteComment: boolean };

export type DeletePostMutationVariables = Exact<{
  id: Scalars['ObjectId']['input'];
}>;


export type DeletePostMutation = { __typename?: 'Mutation', deletePost: boolean };

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


export type GetChannelQuery = { __typename?: 'Query', getChannel?: { __typename?: 'Channel', id: any, name: string, description?: string | null, bannerImageUrl?: string | null, thumbnailUrl?: string | null, createdAt: string, totalPosts: number, isMember: boolean, isFollower: boolean, isPending: boolean, isOwner: boolean, isPrivate: boolean, canModerate: boolean, membersCount?: number | null, followersCount?: number | null, minAge: number, theme: Theme, ownTheme?: Theme | null, coverPattern: CoverPattern, posts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }>, owner: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, community?: { __typename?: 'CommunityRef', id: any, name: string, slug: string } | null } | null };

export type GetChannelBarQueryVariables = Exact<{
  id: Scalars['Int64']['input'];
}>;


export type GetChannelBarQuery = { __typename?: 'Query', getChannel?: { __typename?: 'Channel', id: any, name: string, thumbnailUrl?: string | null, theme: Theme, membersCount?: number | null, isPrivate: boolean, isMember: boolean, isPending: boolean, isOwner: boolean, canModerate: boolean } | null };

export type GetChannelCommunityQueryVariables = Exact<{
  id: Scalars['Int64']['input'];
}>;


export type GetChannelCommunityQuery = { __typename?: 'Query', getChannel?: { __typename?: 'Channel', id: any, community?: { __typename?: 'CommunityRef', id: any, name: string, slug: string } | null } | null };

export type GetCommentsQueryVariables = Exact<{
  parentId: Scalars['ObjectId']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetCommentsQuery = { __typename?: 'Query', getComments: Array<{ __typename?: 'Comment', _id: any, type: PostType, parentId: any, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }> };

export type GetDiscoverQueryVariables = Exact<{
  interests?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  all?: InputMaybe<Scalars['Boolean']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetDiscoverQuery = { __typename?: 'Query', getDiscover: { __typename?: 'FeedPage', nextCursor?: string | null, posts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }>, channels: Array<{ __typename?: 'FeedChannel', id: any, name: string, theme: Theme, thumbnail: string, canModerate: boolean }> } };

export type GetFeedQueryVariables = Exact<{
  after?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetFeedQuery = { __typename?: 'Query', getFeed: { __typename?: 'FeedPage', nextCursor?: string | null, posts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }>, channels: Array<{ __typename?: 'FeedChannel', id: any, name: string, theme: Theme, thumbnail: string, canModerate: boolean }> } };

export type GetPostsQueryVariables = Exact<{
  owner: OwnerInput;
  ids?: InputMaybe<Array<Scalars['ObjectId']['input']> | Scalars['ObjectId']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetPostsQuery = { __typename?: 'Query', getPosts: Array<{ __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } }> };

export type CommentFieldsFragment = { __typename?: 'Comment', _id: any, type: PostType, parentId: any, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } };

export type MetaFieldsFragment = { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any };

export type PersonalizedMetaFieldsFragment = { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } };

export type PostFieldsFragment = { __typename?: 'Post', _id: any, type: PostType, authorId: any, rawContent: any, createdAt: string, privacy: Privacy, allowedPersonaIds: Array<any>, deniedPersonaIds: Array<any>, edited: boolean, tags: Array<string>, updatedAt: string, author: { __typename?: 'Persona', id: any, username: string, fullName: string, profileImageUrl?: string | null, anonymous: boolean }, owner: { __typename?: 'Owner', id: any, type: OwnerType }, meta: { __typename?: 'Meta', commentsCount?: any | null, likesCount: any, viewsCount: any, sharesCount: any }, personalizedMeta: { __typename?: 'PersonalizedMeta', likedByPersona: boolean, viewedByPersona: boolean, sharedByPersona: boolean, acl: { __typename?: 'ACL', canView: boolean, canLike: boolean, canReply: boolean, canShare: boolean, canComment: boolean } } };

export const MetaFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}}]} as unknown as DocumentNode<MetaFieldsFragment, unknown>;
export const PersonalizedMetaFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}}]} as unknown as DocumentNode<PersonalizedMetaFieldsFragment, unknown>;
export const CommentFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Comment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}}]} as unknown as DocumentNode<CommentFieldsFragment, unknown>;
export const PostFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PostFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}}]} as unknown as DocumentNode<PostFieldsFragment, unknown>;
export const CreateCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int32"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SimpleInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tags"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"privacy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Privacy"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnerInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allowedPersonaIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deniedPersonaIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"authorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"tags"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tags"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"privacy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"privacy"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"allowedPersonaIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allowedPersonaIds"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"deniedPersonaIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deniedPersonaIds"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateCommentMutation, CreateCommentMutationVariables>;
export const CreatePostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PortableTextInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tags"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"privacy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Privacy"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnerInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allowedPersonaIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"deniedPersonaIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"authorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"authorId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"tags"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tags"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"privacy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"privacy"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"deniedPersonaIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"deniedPersonaIds"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"allowedPersonaIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allowedPersonaIds"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreatePostMutation, CreatePostMutationVariables>;
export const DeleteCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteCommentMutation, DeleteCommentMutationVariables>;
export const DeletePostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeletePostMutation, DeletePostMutationVariables>;
export const CreateLikeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLike"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PostType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnerInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"liked"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLike"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"targetId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"targetType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetType"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"liked"},"value":{"kind":"Variable","name":{"kind":"Name","value":"liked"}}}]}}]}]}}]} as unknown as DocumentNode<CreateLikeMutation, CreateLikeMutationVariables>;
export const GetChannelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChannel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getChannel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"bannerImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PostFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalPosts"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isMember"}},{"kind":"Field","name":{"kind":"Name","value":"isFollower"}},{"kind":"Field","name":{"kind":"Name","value":"isPending"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"canModerate"}},{"kind":"Field","name":{"kind":"Name","value":"community"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"membersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"minAge"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"ownTheme"}},{"kind":"Field","name":{"kind":"Name","value":"coverPattern"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PostFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetChannelQuery, GetChannelQueryVariables>;
export const GetChannelBarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChannelBar"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getChannel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnailUrl"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"membersCount"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"isMember"}},{"kind":"Field","name":{"kind":"Name","value":"isPending"}},{"kind":"Field","name":{"kind":"Name","value":"isOwner"}},{"kind":"Field","name":{"kind":"Name","value":"canModerate"}}]}}]}}]} as unknown as DocumentNode<GetChannelBarQuery, GetChannelBarQueryVariables>;
export const GetChannelCommunityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChannelCommunity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int64"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getChannel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"community"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetChannelCommunityQuery, GetChannelCommunityQueryVariables>;
export const GetCommentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetComments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getComments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"CommentFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"CommentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Comment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetCommentsQuery, GetCommentsQueryVariables>;
export const GetDiscoverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDiscover"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interests"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"all"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getDiscover"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"interests"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interests"}}},{"kind":"Argument","name":{"kind":"Name","value":"all"},"value":{"kind":"Variable","name":{"kind":"Name","value":"all"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PostFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"canModerate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PostFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetDiscoverQuery, GetDiscoverQueryVariables>;
export const GetFeedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFeed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getFeed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"posts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PostFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"channels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"thumbnail"}},{"kind":"Field","name":{"kind":"Name","value":"canModerate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PostFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetFeedQuery, GetFeedQueryVariables>;
export const GetPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OwnerInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ObjectId"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PostFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Meta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commentsCount"}},{"kind":"Field","name":{"kind":"Name","value":"likesCount"}},{"kind":"Field","name":{"kind":"Name","value":"viewsCount"}},{"kind":"Field","name":{"kind":"Name","value":"sharesCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PersonalizedMetaFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PersonalizedMeta"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"likedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"viewedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"sharedByPersona"}},{"kind":"Field","name":{"kind":"Name","value":"acl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"canView"}},{"kind":"Field","name":{"kind":"Name","value":"canLike"}},{"kind":"Field","name":{"kind":"Name","value":"canReply"}},{"kind":"Field","name":{"kind":"Name","value":"canShare"}},{"kind":"Field","name":{"kind":"Name","value":"canComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PostFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"profileImageUrl"}},{"kind":"Field","name":{"kind":"Name","value":"anonymous"}}]}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rawContent"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"privacy"}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"personalizedMeta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PersonalizedMetaFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"allowedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"deniedPersonaIds"}},{"kind":"Field","name":{"kind":"Name","value":"edited"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<GetPostsQuery, GetPostsQueryVariables>;