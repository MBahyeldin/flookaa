# WWW-123 — Frontend: move GraphQL codegen to Apollo Client 4 and clear the .ts type errors

`npx tsc -b` reports 34 errors, all in `.ts` files, so `pnpm build` passes (`tsc-check` only fails on `.tsx`). This ticket makes `tsc -b` clean.

## Causes

| Errors | File | Why |
|---|---|---|
| 28 | `src/generated/graphql.ts` | `@graphql-codegen/typescript-react-apollo` 4.3.3 writes Apollo Client **3** code; the app runs `@apollo/client` 4.0.6. Its mutation helper types (`MutationFunction`, `MutationResult`, `BaseMutationOptions`) are gone in v4, and its `use…SuspenseQuery` hooks don't type-check for queries with required variables. The plugin has no option to drop those hooks. |
| 6 | `src/components/portable-text/useBlockObjectPopover.ts` | Unused local copy; `toolbar/popover.block-object.tsx` imports the hook from `@portabletext/toolbar`. |
| 1 | `src/utils/permissions.ts` | Imports `User` from `@/types/auth`, which now exports `Info` (same `roles` / `permissions`). |

## Change

### Codegen

- `codegen.yml`: plugins `typescript`, `typescript-operations`, `typed-document-node` (new devDependency `@graphql-codegen/typed-document-node`); remove `typescript-react-apollo` and its config (`withHooks`, `apolloReactHooksImportFrom`). Keep `enumsAsTypes` and `scalars`; add `documentNodeImport: "@apollo/client#TypedDocumentNode"` (Apollo 4 exports it, so no `@graphql-typed-document-node/core` dependency) and `useTypeImports: true` (`verbatimModuleSyntax`). Same output file.
- The output keeps every type name the app imports today (`GetChannelQuery`, `PostFieldsFragment`, enums, …) and every `…Document` name, now as `TypedDocumentNode<Result, Variables>`. It loses the `use…` hooks and the `…HookResult` / `…MutationFn` types, which nothing outside the generated file uses.
- `pnpm remove @graphql-codegen/typescript-react-apollo`.

### Call sites (15 hooks in 11 files)

Mechanical, same options, same results, because the generated hooks only forwarded to these:

- `useXQuery(options)` → `useQuery(XDocument, options)`
- `useXLazyQuery(options)` → `useLazyQuery(XDocument, options)`
- `useXMutation(options)` → `useMutation(XDocument, options)`

from `@apollo/client/react`. Files: `comment-section/{index,input,item}.tsx`, `post-card/index.tsx`, `post-card/useLikePost.ts`, `post-creator/index.tsx`, `personas/[id]/ProfilePosts.tsx`, `personas/[id]/posts/[postId]/index.tsx`, `channels/[id]/index.tsx` (and its `manage/ChannelManageSheet.tsx` type import), `channels/[id]/posts/[postId]/index.tsx`. Places that already pass `…Document` to `client.query` keep working and gain typed results; any type error that surfaces there gets fixed, not cast away.

### Other two

- Delete `useBlockObjectPopover.ts`.
- `permissions.ts`: `User` → `Info`.

### Aborted comment loads (found in QA)

Comments and replies flash "didn't load" on the post page. Running a lazy query again while it's in flight makes Apollo 4 abort the first call, which rejects with `AbortError`. StrictMode's doubled effects do that on every mount, and so does a quick second "View more replies". StrictMode's unmount also tears down the hook's query, aborting a request whose effect won't run again. It happened before this ticket too.

- `useCustomInfinteQuery.loadMore` treats an `AbortError` as superseded: no error and no state change, since the newer call reports its own result.
- `comment-section/item.tsx` `loadReplies` uses a one-off `client.query` instead of a lazy query (its result goes to the store, not the hook), so nothing tied to the component's lifetime can abort it.

### Docs

CLAUDE.md "Frontend conventions": hooks no longer come from the generated file; content queries call `useQuery`/`useLazyQuery`/`useMutation` from `@apollo/client/react` with the generated typed `…Document`.

## Out of scope

Making `tsc-check` fail on `.ts` errors too (not chosen).

## Done when

- `npx tsc -b` reports no errors; `pnpm build` and `pnpm lint` clean.
- `pnpm codegen` regenerates the same file with no diff.
- Browser check (Playwright, logged in): channel page posts and load more, post page with comments, replies, like, comment, delete own comment, create a post, profile Posts tab, feed. Writes go to prod, so only on content the user names.

## Gotchas

- Branch `WWW-123-apollo4-codegen` is cut from `release-beedrill-v1015` after WWW-105 merged (a01735a), so the channel page and `GetChannel.graphql` already carry WWW-105's changes.
