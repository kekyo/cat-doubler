// Type declarations for template files

declare module '*.template?raw' {
  const content: string;
  export default content;
}
