import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Type-safe blog frontmatter, validated at build (Zod):
// title / description / date / type / categories.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    type: z.enum(['feat', 'data', 'ml', 'log']).default('feat'),
    categories: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
