import { z } from 'zod';
import fs from 'fs';
import yaml from 'js-yaml';

const schema = z.object({
  type: z.literal('uiux-project'),
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  overview: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.array(z.union([
      z.object({ type: z.literal('paragraph'), text: z.string() }),
      z.object({ type: z.literal('list'), items: z.array(z.string()) }),
      z.object({ type: z.literal('subheading'), text: z.string() })
    ]))
  }))
});

try {
  const fileContent = fs.readFileSync('./src/content/pro/uiux-vibe-coding.md', 'utf8');
  const frontmatter = yaml.load(fileContent.split('---')[1]);
  console.log('Frontmatter loaded successfully');
  schema.parse(frontmatter);
  console.log('Validation successful!');
} catch (e) {
  console.error('Validation failed:');
  console.error(e);
}
