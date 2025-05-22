// utils/apollo-helpers.ts
export type ApolloState = Record<string, any>;

export const deref =
  (state: ApolloState) =>
  <T>(ref: string | { __ref: string }): T | undefined => {
    const key = typeof ref === 'string' ? ref : ref?.__ref;
    return key ? state[key] : undefined;
  };

export const buildEpisodeUrl = (workId: string, episodeId: string): string =>
  `https://kakuyomu.jp/works/${workId}/episodes/${episodeId}`;
