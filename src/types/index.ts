/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface OneLineOptions {
  oneLine?: boolean
}

// redeclares sanity module so we can add interfaces props to it
declare module 'sanity' {
  // redeclares BlockOptions to add single line option
  interface BlockOptions extends OneLineOptions {}
}
