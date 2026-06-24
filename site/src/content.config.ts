import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Content layer: load concept markdown IN PLACE from the repo's concepts/ dir.
// concepts/ stays the source of truth; Astro renders it without copying.
const concepts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: '../concepts',
  }),
  schema: z
    .object({
      type: z.enum(['concept', 'index', 'reference']).default('concept'),
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(['shipped', 'in-progress', 'planned']).optional(),
      layer: z.enum(['protocol', 'tinycloud-app', 'application']).optional(),
      resource: z.string().optional(),
      sources: z
        .array(
          z.object({
            repo: z.string(),
            path: z.string().optional(),
          })
        )
        .optional(),
      tags: z.array(z.string()).optional(),
      timestamp: z.coerce.string().optional(),
      provenance_note: z.string().optional(),
    })
    // Tolerate unknown frontmatter keys without failing the build.
    .passthrough(),
});

export const collections = { concepts };
