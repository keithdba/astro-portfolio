import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const automotiveCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/automotive" }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    year: z.string(),
    type: z.string(),
    placeholderImage: z.string(),
    specs: z.any() // Using z.any() instead of z.record to bypass the z_od parser bug temporarily in Astro loader
  })
});

const professionalRolesCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/professional-roles" }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    duration: z.string(),
    description: z.string(),
    highlights: z.array(z.string())
  })
});

const professionalSpeakingCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/professional-speaking" }),
  schema: z.object({
    id: z.string(),
    event: z.string(),
    date: z.string(),
    topic: z.string(),
    location: z.string()
  })
});

// The file loader wraps the parsed JSON in an id by default for arrays, but for a single object
// it wraps the entire object inside the `data` property of an entry, so we need to match the object exactly.
const professionalProfileCollection = defineCollection({
  loader: file("src/content/professional-profile/main.json"),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    summary: z.string(),
    contact: z.object({
      email: z.string(),
      linkedin: z.string()
    })
  })
});

export const collections = {
  'automotive': automotiveCollection,
  'professional-roles': professionalRolesCollection,
  'professional-speaking': professionalSpeakingCollection,
  'professional-profile': professionalProfileCollection
};
