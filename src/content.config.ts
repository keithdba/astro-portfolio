import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const autoCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/auto" }),
  schema: ({ image }) => z.object({
    id: z.string(),
    name: z.string(),
    year: z.string(),
    type: z.string(),
    placeholderImage: image(),
    specs: z.record(z.string(), z.string())
  })
});

const proCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pro" }),
  schema: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('role'),
      id: z.string(),
      title: z.string(),
      company: z.string(),
      duration: z.string(),
      description: z.string(),
      highlights: z.array(z.string())
    }),
    z.object({
      type: z.literal('speaking'),
      id: z.string(),
      event: z.string(),
      date: z.string(),
      topic: z.string(),
      location: z.string()
    }),
    z.object({
      type: z.literal('profile'),
      id: z.string(),
      name: z.string(),
      title: z.string(),
      contact: z.object({
        email: z.string(),
        linkedin: z.string()
      })
    }),
    z.object({
      type: z.literal('resume'),
      id: z.string(),
      title: z.string(),
      name: z.string(),
      summary: z.string(),
      contact: z.object({
        email: z.string(),
        linkedin: z.string()
      }),
      experience: z.array(z.object({
        title: z.string(),
        company: z.string(),
        duration: z.string(),
        description: z.string(),
        highlights: z.array(z.string())
      })),
      speaking: z.array(z.object({
        date: z.string(),
        event: z.string(),
        link: z.string(),
        topic: z.string(),
        description: z.string().optional()
      }))
    }),
    z.object({
      type: z.literal('uiux-project'),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      overview: z.string().optional(),
      sections: z.array(z.object({
        heading: z.string(),
        content: z.array(z.discriminatedUnion('type', [
          z.object({ type: z.literal('paragraph'), text: z.string() }),
          z.object({ type: z.literal('list'), items: z.array(z.string()) }),
          z.object({ type: z.literal('subheading'), text: z.string() })
        ]))
      }))
    }),
    z.object({
      type: z.literal('architecture'),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      sections: z.array(z.object({
        heading: z.string(),
        content: z.array(z.discriminatedUnion('type', [
          z.object({ type: z.literal('paragraph'), text: z.string() }),
          z.object({ type: z.literal('list'), items: z.array(z.string()) }),
          z.object({ type: z.literal('subheading'), text: z.string() })
        ]))
      }))
    }),
    z.object({
      type: z.literal('process-architecture'),
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      heroImage: z.string().optional(),
      intro: z.object({
        left: z.array(z.string()),
        right: z.array(z.string())
      }),
      processFlow: z.array(z.object({
        heading: z.string(),
        description: z.string(),
        details: z.array(z.string()).optional()
      })),
      highlight: z.object({
        title: z.string(),
        points: z.array(z.string())
      }),
      roadmap: z.array(z.object({
        heading: z.string(),
        description: z.string()
      }))
    })
  ])
});

export const collections = {
  'auto': autoCollection,
  'pro': proCollection
};
